import datetime
import json
import hashlib

from flanker import mime
from flanker.addresslib import address
from google.appengine.ext import ndb
from google.appengine.api import memcache

from services.search import search_provider
from services.worker import worker_provider
from services.storage import storage_provider

from models.event import Event
from models.util import DateTimeProperty

VALID_STATUSES = ['Pending', 'Benign', 'Malicious']


class Header(ndb.Model):
    """
    Header - represents a key/value header
    """
    name = ndb.StringProperty()
    value = ndb.StringProperty()

    def __str__(self):
        return '{}: {}'.format(self.name, self.value)


class Attachment(ndb.Model):
    """
    Attachment - represents an attachment received in
    an email
    """
    filename = ndb.StringProperty()
    stored_filename = ndb.StringProperty()
    filehash = ndb.StringProperty()
    mime_type = ndb.StringProperty()
    size = ndb.IntegerProperty()


class EmailAddress(ndb.Model):
    name = ndb.StringProperty()
    address = ndb.StringProperty(required=True)

    def __str__(self):
        return '{}@{}'.format(self.name, self.address)


class EmailResponse(ndb.Model):
    """
    EmailResponse - represents a response to a reported email
    """
    date_created = DateTimeProperty(indexed=False, auto_now_add=True)
    date_updated = DateTimeProperty(indexed=False, auto_now=True)
    responder = ndb.StringProperty(required=True)
    sender = ndb.StringProperty(required=True)
    content = ndb.StringProperty(required=True)
    subject = ndb.StringProperty(required=True)

    @classmethod
    def from_dict(cls, data):
        """
        Creates a new instance of an EmailResponse from a dictionary

        :param data: The dictionary containing the response attributes
        """
        response = cls()
        response.sender = data.get('from')
        response.content = data.get('text')
        response.subject = data.get('subject')
        return response


class EmailReport(ndb.Model):
    """
    Report - represents a reported email
    """
    report_type = ndb.StringProperty(required=True, default="email")
    thread_id = ndb.StringProperty()
    history_id = ndb.StringProperty()
    date_received = DateTimeProperty(default=datetime.datetime.min)
    date_reported = DateTimeProperty(auto_now_add=True)
    date_responded = DateTimeProperty(default=datetime.datetime.min)
    has_responded = ndb.BooleanProperty(required=True, default=False)
    status = ndb.StringProperty(required=True, default="Pending")
    headers = ndb.StructuredProperty(Header, repeated=True)
    sender = ndb.StructuredProperty(EmailAddress, required=True)
    reported_by = ndb.StringProperty(required=True)
    reported_domain = ndb.StringProperty(required=True)
    to = ndb.StructuredProperty(EmailAddress, repeated=True)
    subject = ndb.StringProperty()
    html = ndb.StringProperty(indexed=False)
    text = ndb.StringProperty(indexed=False)
    attachments = ndb.KeyProperty(Attachment, repeated=True)
    responses = ndb.KeyProperty(EmailResponse, repeated=True)
    events = ndb.KeyProperty(Event, repeated=True)

    def _pre_put_hook(self):
        """
        Updates the model with the computed `reported_domain` attribute
        """
        self.reported_domain = address.parse(self.reported_by).hostname

    def _post_put_hook(self, future):
        """
        Updates the aggregation metrics in memcached for use in templates

        Raises an exception if there was an error PUT'ing the resource.

        Args:
            future - The async future operation
        """
        # An exception is raised here if there
        # was a problem
        future.check_success()
        # Since the data is "eventually consistent", only update this cache
        # for 5 seconds
        worker_provider.add_task(Stats.update, self.reported_domain, time=5)
        # Finally, add/update a document to the index for searching
        worker_provider.add_task(search_provider.index, self)

    @classmethod
    def _post_delete_hook(cls, key, future):
        """
        Deletes an EmailReport from our search index when it is deleted from
        the datastore.

        Args:
            cls - The model class
            key - The instance ndb.Key
            future - The async future operation
        """
        future.check_success()
        search_provider.delete(str(key.id()))

    def _parse_headers(self, headers):
        '''
        _parse_headers - Parses flanker MIME headers for valid EmailReport headers

        :param headers: The headers in (key, val) format
        '''
        # Parse out known headers
        for h in headers:
            header = Header(name=h[0], value=str(h[1]))
            if header.name == 'Subject':
                self.subject = header.value
            if header.name == 'To':
                for addr in header.value.split(','):
                    try:
                        parsed_addr = address.parse(addr)
                        self.to.append(
                            EmailAddress(
                                name=parsed_addr.display_name,
                                address=parsed_addr.address))
                    except Exception as e:
                        print 'Error parsing To field: {}'.format(e)
            if header.name == 'From':
                try:
                    parsed_addr = address.parse(header.value)
                    self.sender = EmailAddress(
                        name=parsed_addr.display_name,
                        address=parsed_addr.address)
                except Exception as e:
                    print 'Error parsing From field: {}'.format(e)
            self.headers.append(header)

    def _parse_body(self, msg):
        for part in msg.walk():
            if part.is_body():
                if part.content_type.subtype == 'plain':
                    self.text = part.body
                if part.content_type.subtype == 'html':
                    self.html = part.body
            elif part.is_attachment():
                try:
                    filehash = hashlib.sha1()
                    filename = part.detected_file_name
                    filehash.update(part.body)
                    stored_filename = '{}-{}'.format(filehash.hexdigest(),
                                                     filename)
                    attachment = Attachment(
                        filename=filename,
                        stored_filename=stored_filename,
                        filehash=filehash.hexdigest(),
                        mime_type=part.content_type.value,
                        size=len(part.body))
                    self.attachments.append(attachment.put())
                    storage_provider.upload(attachment, part.body)
                except Exception as e:
                    print 'Error parsing attachment: {}'.format(e)
        # If we didn't have a multipart email, detect the content type and
        # store appropriately
        if not msg.parts and msg.body:
            if msg.detected_content_type.subtype == 'plain':
                self.text = msg.body
            if msg.detected_content_type.subtype == 'html':
                self.html = msg.body

    def to_dict(self):
        result = super(EmailReport, self).to_dict(
            exclude=['attachments', 'responses', 'events'])
        if hasattr(self, 'attachments'):
            result['attachments'] = [
                attachment.get().to_dict() for attachment in self.attachments
            ]
        if hasattr(self, 'events'):
            result['events'] = [event.get().to_dict() for event in self.events]
        result['id'] = str(self.key.id())
        return result

    @property
    def searchable_properties(cls):
        return [
            'report_type', 'thread_id', 'history_id', 'date_received',
            'date_reported', 'date_responded', 'has_responded', 'sender',
            'reported_by', 'to', 'subject', 'html', 'text'
        ]

    @classmethod
    def from_raw(cls, data):
        '''
        Parses a raw MIME formatted email into an EmailReport

        :param cls: The class object to return
        :param data: The raw MIME formatted email data
        '''
        report = cls()
        try:
            msg = mime.from_string(data)
        except Exception as e:
            print "Error parsing email: {}".format(e)
            return None
        report._parse_headers(msg.headers.items())
        report._parse_body(msg)
        return report

    @classmethod
    def domain_query(cls, domain):
        """
        Returns a base query already filtered by the given
        email domain
        """
        return cls.query(cls.reported_domain == domain)

    @classmethod
    def get_summaries(cls, base_query):
        """
        Returns the summary of the requested EmailReport objects
        """
        reports = base_query.fetch(projection=[
            cls.key, cls.date_reported, cls.subject, cls.sender.address,
            cls.to.address
        ])
        return reports

    @classmethod
    def get_unread_count(cls, base_query):
        """
        Returns the total number of unread EmailReport objects
        """
        return base_query.filter(cls.has_responded == False).count()

    @classmethod
    def get_recent(cls, base_query):
        """
        Returns the 10 most recent EmailReport objects
        """
        return base_query.order(-cls.date_reported).fetch(10)

    @classmethod
    def get_average_response_time(cls, base_query):
        """
        Returns the average response time for EmailReport objects
        """
        reports = base_query.filter(cls.has_responded == True).fetch(
            projection=[cls.date_reported, cls.date_responded])
        if not reports:
            return datetime.timedelta()
        for report in reports:
            average_response_times = average_response_time + (
                report.date_responded - report.date_reported)
        return average_response_times / len(reports)

    @classmethod
    def get_malicious_count(cls, base_query):
        """
        Returns the number of malicious email reports seen
        """
        return base_query.filter(cls.status == "Malicious").count()

    @classmethod
    def make_sample(cls):
        ''' Returns a sample report for use in testing functions. '''
        return cls(
            report_type='123456_report_type',
            thread_id='1_thread_id',
            history_id='1_history_id',
            date_received=datetime.datetime.now(),
            date_reported=datetime.datetime.now(),
            has_responded=False,
            status='Pending',
            headers=[Header(name="X-Test", value="isthislegit-test")],
            sender=EmailAddress(
                name="John Doe", address="johndoe@example.com"),
            reported_by="johndoe@example.com",
            reported_domain="example.com",
            to=[EmailAddress(name="John Doe", address="johndoe@example.com")],
            subject="Report Test",
            html="<html><body>Report HTML</body></html>",
            text="Report Text")


class Stats(object):
    """
    A wrapper around common memcached caching for domain stats.
    """

    def __init__(self, domain):
        """
        Returns the current stats for a domain
        """
        self._domain = domain
        self._namespace = '{}|{}'.format('stats', domain)
        self.pending = self.get("Pending")
        self.benign = self.get("Benign")
        self.malicious = self.get("Malicious")
        self.total = self.pending + self.benign + self.malicious

    def to_dict(self):
        return {
            'pending': self.pending,
            'benign': self.benign,
            'malicious': self.malicious,
            'total': self.total
        }

    def get(self, status):
        """"
        Gets the count of records for a given status.

        This function will fall back to query the database if no memcached
        result is returned.

        Args:

        status - str - The status to query for
        """
        count = memcache.get(key=status, namespace=self._namespace)
        if count != None:
            return count
        # Update the memcache store if we hit the database
        Stats.update(self._domain)
        return EmailReport.query(EmailReport.reported_domain == self._domain,
                                 EmailReport.status == status).count()

    @classmethod
    def update(cls, domain, time=0):
        """
        Updates the memcached stats for a given domain

        This is used when a report is updated so that memcached
        has the current stats.

        Args:
            domain - str - The domain to use for the namespace
            time - int - The timeout for stored keys (default: 5 seconds)
        """
        namespace = "{}|{}".format('stats', domain)

        for status in VALID_STATUSES:
            count = EmailReport.query(EmailReport.reported_domain == domain,
                                      EmailReport.status == status).count()
            memcache.set(
                key=status, namespace=namespace, value=count, time=time)


class ReporterCount(ndb.Model):
    """
    ResultCount - A mapping of reporters to their report count.

    This is used to make querying for the top n reporters quicker and more
    efficient.
    """
    _memcache_result_count = 5
    _memcache_key = 'report_count'

    domain = ndb.StringProperty(required=True)
    reporter = ndb.StringProperty(required=True)
    count = ndb.IntegerProperty(required=True, default=1)

    def _post_put_hook(self, future):
        future.check_success()
        # Since the data is "eventually consistent", only update this cache
        # for 5 seconds
        ReporterCount.update(self.domain, time=5)

    def to_dict(self):
        return {'reporter': self.reporter, 'count': self.count}

    @classmethod
    def increment(cls, domain, reporter):
        record = cls.query(cls.domain == domain,
                           cls.reporter == reporter).get()
        if record:
            record.count += 1
            record.put()
            return

        record = cls(domain=domain, reporter=reporter)
        record.put()

    @classmethod
    def _get_from_datastore(cls, domain, count):
        query = cls.query().order(-cls.count)
        return [r.to_dict() for r in query.fetch(cls._memcache_result_count)]

    @classmethod
    def get(cls, domain, count=5):
        if count > cls._memcache_result_count:
            return cls._get_from_datastore(domain, count)

        cached = memcache.get(
            key=cls._memcache_key, namespace='{}|'.format(domain))

        if cached:
            return json.loads(cached)

        cls.update(domain)
        return cls._get_from_datastore(domain, count)

    @classmethod
    def update(cls, domain, time=0):
        """
        Updates the memcached stats for a given domain

        This is used when a report is updated so that memcached
        has the current stats.

        Args:
            domain - str - The domain to use for the namespace
            time - int - The timeout for stored keys (default: 5 seconds)
        """
        namespace = "{}|".format(domain)
        records = cls._get_from_datastore(domain, cls._memcache_result_count)
        memcache.set(
            key=cls._memcache_key,
            namespace=namespace,
            value=json.dumps(records),
            time=time)

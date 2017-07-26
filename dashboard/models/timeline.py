from google.appengine.api import memcache
from google.appengine.ext import ndb

from models.util import DateProperty
from models.email import VALID_STATUSES

import datetime
import json


class StatusTimeline(ndb.Model):
    _memcache_date_offset = 30
    _memcache_key = 'status_timeline'

    domain = ndb.StringProperty(required=True)
    date = DateProperty(required=True)
    statuses = ndb.JsonProperty()

    def _pre_put_hook(self):
        """
        Adds the default values for the valid statuses
        """
        for status in VALID_STATUSES:
            if not self.statuses.get(status):
                self.statuses[status] = 0

    @classmethod
    def _get_from_datastore(cls, domain, days):
        """
        Retrieves the last entries from the datastore.
        """
        start = datetime.date.today() - datetime.timedelta(days=days)
        query = cls.query(cls.date >= start,
                          cls.domain == domain).order(cls.date)
        results = query.fetch()
        records = []
        current_date = start

        for result in results:
            while current_date < result.date:
                null_record = {'date': str(current_date), 'statuses': {}}
                for status in VALID_STATUSES:
                    null_record['statuses'][status] = 0
                records.append(null_record)
                current_date += datetime.timedelta(days=1)
            records.append(result.to_dict())
            current_date = result.date + datetime.timedelta(days=1)
        return records

    @classmethod
    def _update_memcached(cls, domain, time=3600 * 24, records=None):
        """
        Updates memcached with the latest data from the datastore
        and returns that data. By default stores entries to expire after
        24 hours.
        """
        namespace = "{}|".format(domain)
        if not records:
            records = cls._get_from_datastore(domain,
                                              cls._memcache_date_offset)
        memcache.set(
            key=cls._memcache_key,
            namespace=namespace,
            value=json.dumps(records),
            time=time)
        return records

    @classmethod
    def get_last(cls, domain, days=30):
        """
        Gets the entries for the specified number of days. This will
        first query memcached, using datastore as a fallback.
        """
        if days > cls._memcache_date_offset:
            return cls._get_from_datastore(domain, days)

        cached = memcache.get(
            key=cls._memcache_key, namespace='{}|'.format(domain))

        if cached:
            records = json.loads(cached)
            return records

        return cls._update_memcached(domain)

    @classmethod
    def update(cls, date, domain, new, old=None):
        """
        Updates a timeline record for a given day. It also attempts
        to update the data (if any) in memcached to prevent a full cache
        reload.
        """
        record = cls.query(cls.date == date).get()
        if not record:
            print 'no record found.'
            record = StatusTimeline(domain=domain, date=date, statuses={})
            record.put()

        if old:
            print 'Removing 1 from {}'.format(old)
            record.statuses[old] -= 1
        print 'Updating entry on {} to {} with new value {}'.format(
            date, new, record.statuses[new])
        record.statuses[new] += 1
        record.put()

        # Temporary update to memcached since the data is eventually
        # consistent
        cls._update_memcached(domain, time=5)

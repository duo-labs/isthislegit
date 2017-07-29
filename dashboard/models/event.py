from google.appengine.ext import ndb

from config import config
from models.util import DateTimeProperty
from models import ISTHISLEGIT_SVC
from services.webhook import webhook_provider
from services.worker import worker_provider


class Event(ndb.Model):
    """
    Event - represents an event on an EmailReport.
    """
    date_created = DateTimeProperty(auto_now_add=True)
    event_type = ndb.StringProperty(required=True)
    name = ndb.StringProperty(required=True)
    message = ndb.StringProperty(required=True)
    created_by = ndb.StringProperty(default=ISTHISLEGIT_SVC)
    details = ndb.JsonProperty()

    def _post_put_hook(self, future):
        """
        Sends a webhook event to any configured webhook urls

        Raises an exception if there was an error PUT'ing the resource.

        Args:
            future - The async future operation
        """
        future.check_success()
        worker_provider.add_task(webhook_provider.send, payload=self.to_dict())


def EventReportCreated(*args, **kwargs):
    ''' Returns an event indicating a report was created.

    TODO: I'd like this to be an Event subclass, but was having trouble
    getting that to work.
    '''
    report = kwargs.get('report')
    return Event(
        name='Report Created',
        event_type='report_created',
        created_by=report.reported_by,
        date_created=report.date_reported,
        message='{} submitted this report.'.format(report.reported_by),
        details={'report': report.to_dict()})


def EventReportResponded(*args, **kwargs):
    ''' Returns an event indicating a report has been responded to. '''
    response = kwargs.get('response')
    report = kwargs.get('report')
    return Event(
        name='Response Created',
        event_type='response_created',
        message='{} responded to this report as {}'.format(
            response.responder, response.sender),
        details={'report': report.to_dict(),
                 'response': response.to_dict()})


def EventAttributeChanged(*args, **kwargs):
    ''' Returns an event indicating a report has had an attribute changed. '''
    creator = kwargs.get('creator')
    attr = kwargs.get('prop')
    value = kwargs.get('value')
    report = kwargs.get('report')
    return Event(
        created_by=creator,
        name='Report Changed',
        event_type='report_changed',
        message='{} has changed the {} of this report to {}'.format(
            creator, attr, value),
        details={'attr': attr,
                 'value': value,
                 'report': report.to_dict()})


def EventRuleMatch(*args, **kwargs):
    ''' Returns an event indicating a rule matched a report. '''
    rule = kwargs.get('rule')
    report = kwargs.get('report')
    return Event(
        name='Rule Matched',
        event_type='rule_matched',
        message='Rule {} matched this report.'.format(rule.name),
        details={'rule': rule.to_dict(),
                 'report': report.to_dict()})

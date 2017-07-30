from flask import render_template_string
from datetime import datetime

from actions.action import BaseAction
from models import ISTHISLEGIT_SVC
from models.email import EmailResponse
from models.event import EventReportResponded
from models.template import Template
from services.email import email_provider


def get_templates(**kwargs):
    """ Gets the list of templates that are accessible to our current user. """
    templates = Template.domain_query(kwargs.get('domain')).fetch()
    return [template.name for template in templates]


class SendTemplateAction(BaseAction):
    """
    Sends a template specified by the provided template_name to the
    user who sent the initial report.
    """
    action_id = 'send_template'
    name = "Send Template"
    description = "Sends a template in response to the report"
    options = {
        "template_name": {
            "name": "Template Name",
            "choiceFunc": get_templates
        }
    }

    def execute(self, report, options):
        template_name = options.get('template_name')
        if not template_name:
            return
        base_query = Template.domain_query(report.reported_domain)
        template = Template.get_by_name(base_query, template_name)
        if not template:
            return

        subject = render_template_string(template.subject, report=report)
        body = render_template_string(template.text, report=report)

        response = EmailResponse(
            responder=ISTHISLEGIT_SVC,
            sender=template.sender,
            content=body,
            subject=subject)
        try:
            response_key = response.put()
            report.responses.append(response_key)
            if not report.date_responded:
                report.date_responded = datetime.now()

            event_key = EventReportResponded(
                response=response, report=report).put()
            report.events.append(event_key)
            report.put()

            email_provider.send(
                to=report.reported_by,
                sender=response.sender,
                subject=subject,
                body=body)
        except Exception as e:
            return

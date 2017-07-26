from actions.action import BaseAction
from datetime import datetime

from models.email import EmailReport
from models.template import Template
from services.email import email_provider


def getTemplates(**kwargs):
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
            "choiceFunc": getTemplates
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

        response = EmailReponse(
            sender=template.sender,
            content=template.text,
            subject=template.subject)
        try:
            response_key = response.put()
            report.responses.append(response_key)
            if not report_date_responded:
                report.date_responded = datetime.now()

            email_provider.send(
                to=report.reported_by,
                sender=g.user.email(),
                subject=response.subject,
                body=response.content)
        except Exception as e:
            return

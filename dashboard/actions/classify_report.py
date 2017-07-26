from actions.action import BaseAction

from models.email import EmailReport, VALID_STATUSES


class ClassifyReportAction(BaseAction):
    action_id = 'classify_report'
    name = "Classify Report"
    description = "Classifies a report automatically"
    options = {
        "classification": {
            "name": "Classification",
            "choices": VALID_STATUSES
        }
    }

    def execute(self, report, options):
        """ Re-classifies the report to the selected status. """
        report.status = options.get('classification')

        try:
            report.put()
        except Exception as e:
            return

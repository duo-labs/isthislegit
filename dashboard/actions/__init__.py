from actions.send_template import SendTemplateAction
from actions.classify_report import ClassifyReportAction

actions = [
    SendTemplateAction,
    ClassifyReportAction
]

def load(action_id):
    for action in actions:
        if action.action_id == action_id:
            return action()

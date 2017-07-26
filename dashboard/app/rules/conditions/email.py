from app.rules import Condition

class EmailCondition(Condition):
    ''' EmailCondition matches an attribute of the EmailReport.

    This is done by a simple regex.'''
    def match(report, field, value):
        pass

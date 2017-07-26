from google.appengine.ext import ndb

import json

from models.util import DateTimeProperty
from models.email import EmailReport
import actions


class RuleValidationException(Exception):
    """
    RuleValidationException - a generic validation error
    """

    def __init__(self, message):
        super(RuleValidationException, self).__init__(message)
        self.message = message

    def __str__(self):
        return self.message


class RuleCondition(ndb.Model):
    """
    RuleCondition - represents a condition to be matched
    """
    attribute = ndb.StringProperty(required=True)
    key = ndb.StringProperty()
    value = ndb.StringProperty()
    matches = ndb.StringProperty(required=True)

    def _text_match(self, matches, got, expected):
        if matches == 'regex':
            return re.search(got, expected)
        elif matches == 'equals':
            return got == expected
        else:
            return False

    def match(self, report):
        '''
        Returns a boolean indicating if the condition matched the provided
        report.
        '''
        matches = False
        # Try to match the headers
        if self.attribute == 'header':
            for header in report.headers:
                if self.key == "" or self._text_match(self.matches,
                                                      header.name, self.key):
                    if self.value == "" or self._text_match(
                            self.matches, header.value, self.value):
                        matches = True

        # Try to match the text/html
        if self.attribute == 'body':
            if self.value != "":
                if self._text_match(self.matches, report.text, self.value):
                    matches = True
                if self_text_match(self.matches, report.html, self.value):
                    matches = True
        return matches


class RuleAction(ndb.Model):
    """
    RuleAction - represents an action to occur when a rule matches an
    EmailReport
    """
    action = ndb.StringProperty(required=True)
    options = ndb.JsonProperty(required=True)

    def execute(self, report):
        """
        Loads and executes the correct rule on the report
        """
        action = actions.load(self.action)
        if not action:
            return None
        result = action.execute(report, self.options)
        return result


class Rule(ndb.Model):
    """
    Rule - represents a rule to apply to incoming EmailReports
    """
    name = ndb.StringProperty(required=True)
    date_created = DateTimeProperty(indexed=False, auto_now_add=True)
    date_updated = DateTimeProperty(indexed=False, auto_now=True)
    owner_domain = ndb.StringProperty(required=True)
    created_by = ndb.StringProperty(required=True)
    active = ndb.BooleanProperty(default=False, required=True)
    conditions = ndb.StructuredProperty(RuleCondition, repeated=True)
    actions = ndb.StructuredProperty(RuleAction, repeated=True)

    @classmethod
    def domain_query(cls, domain):
        return cls.query(cls.owner_domain == domain)

    @classmethod
    def get_by_name(cls, base_query, name):
        """ Returns the template that matches the given name."""
        return base_query.filter(cls.name == name).get()

    @classmethod
    def validate(cls, data):
        """
        Validates a rule

        :param data: The dictionary containing the rule attributes
        """
        required_props = ['name']
        for prop in required_props:
            if not data.get(prop):
                raise RuleValidationError(
                    'Missing required field {}'.format(prop))
        '''
        for condition in data.get('conditions'):
            if not condition.validate():
                return False
        for action in data.get('actions'):
            if not action.validate():
                return False
        '''
        return True

    def from_dict(self, data):
        """
        Sets attributes of a rule according to values given in a dict.

        :param data: The dictionary containing the rule attributes
        """
        self.name = data.get('name')
        self.active = data.get('active')
        self.conditions = []
        self.actions = []
        for condition in data.get('conditions'):
            self.conditions.append(
                RuleCondition(
                    attribute=condition.get('attribute'),
                    key=condition.get('key'),
                    value=condition.get('body'),
                    matches=condition.get('matches')))
        for action in data.get('actions'):
            self.actions.append(
                RuleAction(
                    action=action.get('action'), options=action.get(
                        'options')))

    def evaluate(self, report):
        """
        Returns a boolean if the rule was evaluated against
        the provided EmailReport

        :param report: The EmailReport to check
        """
        for condition in self.conditions:
            if not condition.match(report):
                return False
        # If we made it this far, the rule matched
        # Let's perform every action
        exceptions = []
        for action in self.actions:
            try:
                action.execute(report)
            except Exception as e:
                exceptions.append(e)
        return True

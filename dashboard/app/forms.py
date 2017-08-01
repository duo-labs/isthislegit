# -*- coding: utf-8 -*-
""" Template forms """
from flask_wtf import Form
from flanker.addresslib import address

from wtforms import StringField, FormField, SelectField, FieldList, BooleanField
from wtforms.validators import DataRequired

from models.template import Template


class TemplateForm(Form):
    """ New template form """

    name = StringField('Name', validators=[DataRequired()])

    subject = StringField('Subject')
    text = StringField('Message')

    def __init__(self, *args, **kwargs):
        """ Create new template """
        super(TemplateForm, self).__init__(*args, **kwargs)
        self.template_id = kwargs.get('template_id')
        self.domain = kwargs.get('domain')

    def validate(self):
        """ Validate the form """
        data_validation = super(TemplateForm, self).validate()
        if not data_validation:
            return False
        template = Template.query(Template.name == self.name.data,
                                  Template.owner_domain == self.domain).get()

        if template and (not self.template_id or
                         template.key.id() != self.template_id):
            self.name.errors.append('already in use')
            return False
        return True


class SendTestTemplateForm(Form):
    ''' Form to send a test template '''
    subject = StringField('Subject')
    text = StringField('Message')
    recipient = StringField('Recipient', validators=[DataRequired()])


class SearchForm(Form):
    ''' Search form '''

    query = StringField('Query', validators=[DataRequired()])

    def __init__(self, *args, **kwargs):
        ''' Create a new search query '''
        super(SearchForm, self).__init__(*args, **kwargs)
        self.query = kwargs.get('query')


class ConditionForm(Form):

    attribute = SelectField(
        'Attribute',
        validators=[DataRequired()],
        choices=[('header', 'Header'), ('body', 'Body')])
    key = StringField('Key')
    value = StringField('Value', validators=[DataRequired()])
    matches = SelectField(
        'Matches',
        validators=[DataRequired()],
        choices=[('equals', '= (Exact Match'), ('regex', '~= (Regex)')])


class ActionForm(Form):
    actions = SelectField('Action')
    options = FieldList(StringField())


class RuleForm(Form):
    ''' Rule form '''

    name = StringField('Name', validators=[DataRequired()])
    active = BooleanField('Active', validators=[DataRequired()])
    conditions = FieldList(FormField(ConditionForm), min_entries=1)
    actions = FieldList(FormField(ActionForm), min_entries=1)

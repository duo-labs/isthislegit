import os

from flask import Blueprint, render_template, render_template_string, request, url_for, redirect, jsonify, g, abort
from google.appengine.api import users
from flanker.addresslib import address

from models.email import (EmailReport, Stats, ReporterCount)
from models.template import Template
from models.rule import Rule
from forms import TemplateForm, SearchForm, SendTestTemplateForm
from services.search import search_provider
from services.email import email_provider

app_blueprint = Blueprint('app_blueprint', __name__)


@app_blueprint.before_request
def context_setup():
    """
    Sets up context for the request
    """
    g.user = users.get_current_user()
    g.domain = address.parse(g.user.email()).hostname
    g.stats = Stats(g.domain)
    g.base_report_query = EmailReport.domain_query(g.domain)


@app_blueprint.route('/stats', methods=['GET'])
def stats():
    ''' Returns the stats for the domain '''
    return jsonify(g.stats.to_dict())


@app_blueprint.route('/', methods=["GET"])
def index():
    reports = EmailReport.get_recent(g.base_report_query)
    average_response_time = EmailReport.get_average_response_time(
        g.base_report_query)
    top_reporters = ReporterCount.get(g.domain)
    return render_template(
        'index.html',
        title="Dashboard",
        reports=reports,
        top_reporters=top_reporters,
        average_response_time=average_response_time)


@app_blueprint.route('/logout', methods=['GET'])
def logout():
    '''
    Manually override the logout URL to avoid completely signing the user
    out of all Google accounts
    '''
    if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
        return redirect('_ah/logout?continue=https://' + request.host + '/')
    return redirect(users.create_logout_url('/'))


@app_blueprint.route('/reports/<int:report_id>', methods=["GET"])
def view_report(report_id):
    report = EmailReport.get_by_id(report_id)
    if not report:
        abort(404)
    return render_template(
        'report.html',
        title='Report Details - {}'.format(report.key.id()),
        report=report,
        events=[event.get() for event in report.events])


def json_error(status_code, message, data):
    return jsonify({'success': False, 'error': message}), status_code


@app_blueprint.route('/reports', methods=["GET"])
def reports():
    return render_template('reports.html', title='Reports')


@app_blueprint.route('/templates', methods=["GET", "POST"])
def templates():
    if request.method == "GET":
        templates = Template.domain_query(g.domain).fetch()
        return render_template("templates.html", templates=templates)

    form = TemplateForm(request.form, domain=g.domain)
    if form.validate_on_submit():
        template = Template(
            name=form.name.data,
            text=form.text.data,
            subject=form.subject.data,
            sender=g.user.email(),
            owner_domain=g.domain,
            created_by=g.user.email())
        template.put()
        return jsonify(template.to_dict())
    return json_error(400, list_errors(form), {})


@app_blueprint.route('/templates/<int:template_id>', methods=['POST'])
def edit_template(template_id):
    '''
    Edits an existing template.

    Args:
    template_id - int - The ID of the template to edit
    '''
    template = Template.get_by_id(template_id)
    if not template or template.owner_domain != g.domain:
        abort(404)

    form = TemplateForm(request.form, domain=g.domain, template_id=template_id)
    if form.validate_on_submit():
        template.name = form.name.data
        template.text = form.text.data
        template.subject = form.subject.data
        template.sender = g.user.email()
        template.put()
        return jsonify(template.to_dict())
    return json_error(400, list_errors(form), {})


@app_blueprint.route('/templates/send_test', methods=['POST'])
def send_test_template():
    '''
    Sends a test template to the provided address
    '''
    form = SendTestTemplateForm(request.form)
    if form.validate_on_submit():
        report = EmailReport.make_sample()
        try:
            subject = render_template_string(form.subject.data, report=report)
            text = render_template_string(form.text.data, report=report)
            email_provider.send(
                to=form.recipient.data,
                sender=g.user.email(),
                subject=subject,
                body=text)
            return jsonify({'success': True, 'message': 'Sent test email.'})
        except Exception as e:
            return json_error(400, str(e), {})
    return json_error(400, list_errors(form), {})


@app_blueprint.route('/templates/<int:template_id>/delete', methods=["POST"])
def delete_template(template_id):
    template = Template.get_by_id(template_id)
    if not template or template.owner_domain != g.domain:
        abort(404)

    template.key.delete()
    return redirect(url_for('app_blueprint.templates'))


@app_blueprint.route('/search', methods=['POST'])
def search():
    form = SearchForm(request.form)
    reports = []
    if form.validate_on_submit():
        results = search_provider.search(form['query'].data)
        for result in results:
            report = {f.name: f.value for f in result.fields}
            report['id'] = result.doc_id
            reports.append(report)
        return render_template('search.html', reports=reports)
    return render_template('search.html', reports=reports)


@app_blueprint.route('/rules', methods=["GET", "POST"])
def rules():
    if request.method == "GET":
        rules = Rule.domain_query(g.domain).fetch()
        return render_template('rules.html', rules=rules, title='Rules')

    try:
        rule_json = request.get_json()
        Rule.validate(rule_json)
    except Exception as e:
        return json_error(400, str(e), {})

    base_query = Rule.domain_query(g.domain)
    name_rule = Rule.get_by_name(base_query, request.get_json().get('name'))
    if name_rule:
        return json_error(400, 'Rule name already in use', {})

    try:
        rule = Rule()
        rule.from_dict(request.get_json())
        rule.owner_domain = g.domain
        rule.created_by = g.user.email()
        rule.put()
        return jsonify(rule.to_dict())
    except Exception as e:
        return json_error(400, str(e), {})


@app_blueprint.route('/rules/<int:rule_id>', methods=["POST"])
def edit_rule(rule_id):
    orig_rule = Rule.get_by_id(rule_id)
    if not orig_rule or orig_rule.owner_domain != g.domain:
        return json_error(404, "Rule not found", {})

    try:
        rule_json = request.get_json()
        Rule.validate(rule_json)
    except Exception as e:
        return json_error(400, str(e), {})

    base_query = Rule.domain_query(g.domain)
    name_rule = Rule.get_by_name(base_query, rule_json.get('name'))
    if name_rule and name_rule.key.id() != rule_id:
        return json_error(400, 'Rule name already in use', {})

    try:
        orig_rule.from_dict(request.get_json())
        orig_rule.put()
        return jsonify(orig_rule.to_dict())
    except Exception as e:
        return json_error(400, str(e), {})


@app_blueprint.route('/rules/<int:rule_id>/delete', methods=["POST"])
def delete_rule(rule_id):
    rule = Rule.get_by_id(rule_id)
    if not rule or rule.owner_domain != g.domain:
        abort(404)

    rule.key.delete()
    return redirect(url_for('app_blueprint.rules'))


def list_errors(form):
    """Flash all errors for a form."""
    error_list = []
    for field, errors in form.errors.items():
        for error in errors:
            error_list.append(
                '{0} - {1}'.format(getattr(form, field).label.text, error))
    return error_list

from flask import Blueprint, g, request, jsonify, Response, abort, current_app, render_template_string
from datetime import datetime
from flanker.addresslib import address

from google.appengine.api import users

from models.email import EmailReport, EmailResponse
from models.timeline import StatusTimeline
from models.template import Template
from models.rule import Rule
from models.event import EventAttributeChanged, EventReportResponded
from services.email import email_provider
from services.worker import worker_provider
from actions import actions

import json

api_blueprint = Blueprint('api', __name__, url_prefix='/api')


@api_blueprint.before_request
def context_setup():
    """
    Sets up context for the request
    """
    g.user = users.get_current_user()
    g.domain = address.parse(g.user.email()).hostname
    g.base_report_query = EmailReport.domain_query(g.domain)


def build_query(request):
    """
    Builds an EmailReport query based on the request arguments.

    Currently, the following arguments are supported:

    query: string
    fields: comma separated string
    sort: enum(asc, dec)

    It should be noted that, if a full text search on the text/html
    attributes is required, this must be handled separately by the caller.

    Returns: EmailReport.query object
    """

    search_query = g.base_report_query

    for key, value in request.values.iteritems():
        if key not in EmailReport.searchable_properties:
            continue
        # Handle querying for EmailAddress properties
        if key == "to":
            pass

    return query


@api_blueprint.route('/timeline', methods=["GET"])
def timeline():
    """
    Returns the StatusTimeline for the last 30 days
    """
    timeline = StatusTimeline.get_last(g.domain)
    return jsonify(timeline)


@api_blueprint.route('/reports', methods=["GET"])
def reports():
    """
    Returns the current reports in the system
    """
    reports = g.base_report_query.fetch()
    reports_dict = [report.to_dict() for report in reports]
    # Return the reports that we have access to
    return jsonify(reports_dict)


@api_blueprint.route('/reports/summary', methods=["GET"])
def reports_summary():
    """
    Returns the summaries for the reports
    """
    reports = EmailReport.get_summaries(g.base_report_query)
    reports_dict = [report.to_dict() for report in reports]
    return jsonify(reports_dict)


@api_blueprint.route('/reports/<int:report_id>', methods=['GET', 'PUT'])
def report(report_id):
    """
    Returns or modifies an existing report

    Args:
        report_id - str - The urlsafe key for the EmailReport
    """
    report = EmailReport.get_by_id(report_id)
    if not report:
        return json_error(404, 'Report not found', {})
    if request.method == 'GET':
        return jsonify(report.to_dict())
    if request.method == 'PUT':
        valid_properties = ['status']
        for prop, val in request.get_json().items():
            if prop not in valid_properties:
                continue
            if prop == 'status':
                worker_provider.add_task(
                    StatusTimeline.update,
                    report.date_reported.date(),
                    report.reported_domain,
                    val,
                    old=report.status)
            setattr(report, prop, val)
            report.events.append(
                EventAttributeChanged(
                    creator=g.user.email(),
                    prop=prop,
                    value=val,
                    report=report).put())
        report.put()
        return jsonify(report.to_dict())


@api_blueprint.route('/reports/<int:report_id>/reply', methods=['POST'])
def report_reply(report_id):
    """
    Replies to an existing report. The email reply is constructed and sent
    to the email address that original reported the phish.

    Args:
        report_id - str - The urlsafe key for the EmailReport

    TODO: Make this a nice template or something
    """
    report = EmailReport.get_by_id(report_id)
    if not report:
        return json_error(404, 'Report not found', {})

    sender_address = g.user.email()
    response = EmailResponse.from_dict(request.get_json())
    if not response:
        return json_error(400, 'Invalid JSON', {})

    response.responder = sender_address

    try:
        response_key = response.put()
        report.responses.append(response_key)
        if not report.date_responded:
            report.date_responded = datetime.now()

        event_key = EventReportResponded(
            response=response, report=report).put()
        report.events.append(event_key)

        report.put()

        subject = render_template_string(response.subject, report=report)
        body = render_template_string(response.content, report=report)

        email_provider.send(
            to=report.reported_by,
            sender=g.user.email(),
            subject=subject,
            body=body)
    except Exception as e:
        return json_error(400, str(e), {})

    return jsonify(report.to_dict())


@api_blueprint.route('/templates/<int:template_id>', methods=["GET"])
def template(template_id):
    """
    Returns an existing template
    
    Args:
        template_id - int - The ID of the Template
    """
    template = Template.get_by_id(template_id)
    if not template or template.owner_domain != g.domain:
        return json_error(404, 'Template not found', {})
    return jsonify(template.to_dict())


@api_blueprint.route('/templates/<int:template_id>/delete', methods=['POST'])
def delete_template(template_id):
    '''
    Deletes and existing template

    Args:
        template_id - int - the ID of the Template
    '''
    template = Template.get_by_id(template_id)
    if not template or template.owner_domain != g.domain:
        return json_error(404, 'Template not found', {})
    template.key.delete()
    return jsonify({'success': True, 'error': None, 'data': {}})


@api_blueprint.route('/rules/<int:rule_id>', methods=["GET"])
def rule(rule_id):
    """
    Returns an existing template
    
    Args:
        rule_id - int - The ID of the Rule 
    """
    rule = Rule.get_by_id(rule_id)
    if not rule:
        return json_error(404, 'Rule not found', {})
    return jsonify(rule.to_dict())


@api_blueprint.route('/rules/<int:rule_id>/delete', methods=['POST'])
def delete_rule(rule_id):
    '''
    Deletes and existing rule

    Args:
        rule_id - int - the ID of the Rule
    '''
    rule = Rule.get_by_id(rule_id)
    if not rule or rule.owner_domain != g.domain:
        return json_error(404, 'Rule not found', {})
    rule.key.delete()
    return jsonify({'success': True, 'error': None, 'data': {}})


@api_blueprint.route('/rules/actions', methods=["GET"])
def get_actions():
    """
    Returns the possible actions configured on the system.
    """
    return current_app.response_class(
        json.dumps([
            action.to_dict(domain=g.domain, user=g.user) for action in actions
        ]),
        mimetype='application/json')


def json_error(status_code, message, data):
    return jsonify({'success': False, 'error': message}), status_code


def jsonify(data):
    """
    Returns a JSON encoded response containing the encoded data

    Args:
        data - JSON serializable object (e.g. a dict)
    """
    return Response(json.dumps(data, indent=4), mimetype='application/json')

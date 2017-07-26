from flask import Blueprint, make_response, current_app, request, jsonify
from flanker.addresslib import address

from models.email import (EmailReport, ReporterCount)
from models.timeline import StatusTimeline
from models.rule import Rule
from models.event import EventReportCreated, EventRuleMatch
from extensions import csrf_protect, crossdomain
from services.email import email_provider
from services.worker import worker_provider

report_blueprint = Blueprint(
    'report_blueprint', __name__, url_prefix='/report')


@csrf_protect.exempt
@report_blueprint.route('/', methods=['POST', 'OPTIONS'])
@crossdomain(origin='*', headers=['Content-Type'])
def report():
    ''' Receives a report in JSON format '''
    payload = request.get_json()

    reported_by = payload.get('reported_by', '').encode('utf-8')
    if not reported_by:
        return json_error(400, 'Missing reported_by param', {})
    reported_domain = address.parse(reported_by).hostname

    msg_id = payload.get('message_id', '').encode('utf-8')
    report = payload.get('report', '').encode('utf-8')

    if msg_id:
        raw = email_provider.fetch(userId=reported_by, messageId=msg_id)
    elif report:
        raw = payload.get('report').encode('utf-8')
    else:
        return json_error(400, 'Missing message_id or report params', {})

    try:
        report = EmailReport.from_raw(raw)
        report.reported_by = reported_by
        report.put()

        event_key = EventReportCreated(report=report).put()
        report.events.append(event_key)
        report.put()

        ReporterCount.increment(report.reported_domain, reported_by)

    except Exception as e:
        print str(e)
        return json_error(400, str(e), {})

    rules = Rule.domain_query(reported_domain).fetch()
    rule_match = False
    for rule in rules:
        if not rule.active:
            continue
        result = rule.evaluate(report)
        if result:
            rule_match = True
            event_key = EventRuleMatch(rule=rule, report=report).put()
            report.events.append(event_key)
    # Only do a PUT operation once to save time
    if rule_match:
        report.put()

    StatusTimeline.update(report.date_reported.date(), report.reported_domain,
                          report.status)

    # parse the stuff
    return jsonify({'success': True, 'error': None, 'data': {}})


def json_error(status_code, message, data):
    return jsonify({'success': False, 'error': message}), status_code
from flask import request, jsonify, Blueprint, g
from flanker.addresslib import address

from google.appengine.api import users
from google.appengine.ext import ndb

from models.email import EmailReport

ajax_blueprint = Blueprint('ajax_blueprint', __name__,
    url_prefix='/ajax')

@ajax_blueprint.before_request
def context_setup():
    """
    Sets up context for the request
    """
    g.user = users.get_current_user()
    g.domain = address.parse(g.user.email()).hostname

@ajax_blueprint.route('/reports', methods=['GET'])
def ajax_reports():
    offset = request.args.get('start', type=int)
    limit = request.args.get('length', type=int)
    search_term = request.args.get('search[value]')
    order_index = request.args.get('order[0][column]', type=int)
    order_dir = request.args.get('order[0][dir]')

    fields = [EmailReport.date_reported,
        EmailReport.reported_by,
        EmailReport.report_type,
        EmailReport.subject,
        EmailReport.status]

    query = EmailReport.domain_query(g.domain)
    total_count = query.count()

    # Setup the correct ordering
    order_field = EmailReport.key
    if order_index > 0:
        order_field = fields[order_index - 1]
    if order_dir == 'desc':
        order_field = -order_field

    query_options = ndb.QueryOptions(limit=limit, offset=offset)

    results = query.order(order_field).fetch(options=query_options, projection=fields)
    results_json = [result.to_dict() for result in results]
    return jsonify({
        'draw': int(request.args.get('draw')),
        'recordsTotal': total_count,
        'recordsFiltered' : total_count,
        'data': results_json
    })

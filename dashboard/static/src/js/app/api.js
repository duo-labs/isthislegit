"use strict";

$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!/^(GET|HEAD|OPTIONS|TRACE)$/i.test(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", csrf_token);
        }
    }
});

class API {
    constructor() {
        this.base_url = '/api'
    }
    _send(endpoint, method, data) {
        return $.ajax({
            url: this.base_url + endpoint,
            method: method,
            data: JSON.stringify(data),
            dataType: "json",
            contentType: "application/json"
        })
    }
    post_report_reply(report_id, data) {
        return this._send('/reports/' + report_id + '/reply', 'POST', data)
    }
    put_report(report_id, data) {
        return this._send('/reports/' + report_id, 'PUT', data)
    }
    get_template(template_id) {
        return this._send('/templates/' + template_id, 'GET', {})
    }
    delete_template(template_id) {
        return this._send('/templates/' + template_id + '/delete', 'POST', {})
    }
    get_rule(rule_id) {
        return this._send('/rules/' + rule_id, 'GET', {})
    }
    delete_rule(rule_id) {
        return this._send('/rules/' + rule_id + '/delete', 'POST', {})
    }
    get_actions() {
        return this._send('/rules/actions', 'GET', {})
    }
    get_timeline() {
        return this._send('/timeline', 'GET', {})
    }
}

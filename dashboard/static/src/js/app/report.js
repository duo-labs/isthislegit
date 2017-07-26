"use strict";
const $api = new API();

var modalFlash = (text, cls) => {
    $("#modal_flash").addClass(cls).text(text).show();
}

var html_preview = (html) => {
    $("#html_preview").html(DOMPurify.sanitize(html));
    $("#html_preview").tooltip({
        'selector' : 'a',
        'placement' : 'top',
        'title' : function() { return $(this).attr('href'); }
    });
}

var _update_status = (report_status) => {
    $("#report-status").text(report_status);
    $("#report-status-btn").attr(
        'class', 'btn btn-sm dropdown-toggle btn-' + templates.status_class(report_status))
}

$(document).ready(function() {
    // TODO: Make this a proper regex..
    const report_id = location.pathname.split('/').pop();
	_update_status($("#report-status").text());
    $("#reply_form").submit((e) => {
        // Submit the form via the API
        $api.post_report_reply(report_id, $("#reply_form").serializeObject())
            .success((response) => {
                new PNotify({
                    title: 'Reply Sent',
                    text: 'The response was sent successfully.',
                    type: 'success',
                    styling: 'bootstrap3'
                });
                $("#modal_flash").hide();
                $("#reply_modal").modal('hide');
            })
        .error((response) => {
            modalFlash(response.responseJSON.error, "alert-danger");
        });
        e.preventDefault();
    });

    // BEGIN Update report status
    $("#status-dropdown a").on("click", function() {
		var report_status = $(this).text();
        $api.put_report(report_id, { "status": report_status })
        .success((response) => {
            _update_status(report_status);
            new PNotify({
                title: 'Status Updated',
                text: 'The report has been updated.',
                type: 'success',
                styling: 'bootstrap3'
            });
        })
        .error((response) => {
            new PNotify({
                title: 'Error updating status',
                text: response.message,
                type: 'danger',
                styling: 'bootstrap3'
            });
        });
    })
    // END update report status
    $("[data-type='datetime']").each(function(i, e){
        let dt = moment.utc($(this).text()).local().format('MMMM Do YYYY, h:mm a')
        let rt = moment.utc($(this).text()).fromNow()
        $(this).text(`${dt} (${rt})`);
    })
})

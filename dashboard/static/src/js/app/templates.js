"use strict";
const $api = new API();

const modalFlash = (text, cls) => {
    $("#modal_flash").addClass(cls).text(text).show();
}

const edit = (id) => {
    $("#template_modal").modal('show');
    if (id != -1) {
        $api.get_template(id)
            .success((template) => {
                $("#name").val(template.name);
                $("#subject").val(template.subject);
                $("#text").val(template.text);
            })
            .error((response) => {
                modalFlash(response.responseJSON.error, 'alert-danger')
            });
    }
}

const deleteTemplate = (id) => {
    swal({
        title: 'Are you sure?',
        text: "You won't be able to undo this.",
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        confirmButtonColor: '#d9534f',
        reverseButtons: true,
        showLoaderOnConfirm: true,
        allowOutsideClick: false,
        preConfirm: function () {
            return new Promise(function (resolve, reject) {
                $api.delete_template(id)
                    .success((response) => {
                        resolve()
                    })
                    .error((response) => {
                        reject(response.responseJSON.error)
                    })
            })
        }
    }).then(function () {
        new PNotify({
            title: 'Template Deleted',
            text: 'The template was deleted successfully.',
            type: 'success',
            styling: 'bootstrap3'
        });
    })
}

$(document).ready(function () {
    // TODO: Make this a proper regex..
    const report_id = location.pathname.split('/').pop();
    $("#template_form").submit((e) => {
        // Submit the form via the API
        $.post("/templates", $("#template_form").serialize())
            .success((response) => {
                new PNotify({
                    title: 'Template Created',
                    text: 'The template was created successfully.',
                    type: 'success',
                    styling: 'bootstrap3'
                });
                $("#modal_flash").hide();
                $("#template_modal").modal('hide');
            })
            .error((response) => {
                modalFlash(response.responseJSON.error, "alert-danger");
            });
        e.preventDefault();
    });

    // Reset the modal after dismiss
    $('.modal').on('hidden.bs.modal', function () {
        $(this).find('form')[0].reset();
        $(this).find('textarea').val("");
    });

    $('#new_template_btn').click(() => { edit(-1) });

    $("#templates-datatable").DataTable({
        order: [[1, "desc"]],
        columnDefs: [
            {
                "render": function (data, type, row) {
                    return moment.utc(data).local().format('MMMM Do YYYY, h:mm:ss a')
                },
                "targets": 2
            }
        ]
    });
})

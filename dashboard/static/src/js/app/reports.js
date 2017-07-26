$(document).ready(function() {
	$("#reports-datatable").DataTable({
		searching: false,
		serverSide: true,
		ajax: '/ajax/reports',
		order: [[ 1, "desc" ]],
		columnDefs: [
		{
			"render": function(data, type, row ) {
				return '<a href="/reports/' + data + '">' + data + '</a>'
			},
			"targets": 0
		},
        {
            "render": function(data, type, row){
                return moment.utc(data).local().format('MMMM Do YYYY, h:mm:ss a')
            },
            "targets": 1
        },
		{
			"render": function(data, type, row) {
				return templates.type_icon(data)
			},
			"targets": 3
		},
        {
            "render": function(data, type, row) {
                return templates.status_label(data);
            },
            "targets": 5
        }
		],
		columns: [
		{ data: 'id' },
		{ data: 'date_reported' },
		{ data: 'reported_by' },
		{ data: 'report_type' },
		{ data: 'subject' },
		{ data: 'status' },
		]
	});
})

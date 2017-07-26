$(document).ready(function() {
    $("#reports-datatable").DataTable({
		searching: false,
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
		]
	});
});

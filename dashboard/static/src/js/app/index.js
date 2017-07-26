const $api = new API()

let chartColors = {
    'benign': '#5cb85c',
    'malicious': '#d9534f',
    'pending': '#aaa'
}

let createTimelineChart = (timeline) => {
    let timeline_data = {
        'Pending': [],
        'Benign': [],
        'Malicious': []
    }
    $.each(timeline, (i, record) => {
        $.each(record.statuses, (status, count) => {
            timeline_data[status].push([moment.utc(record.date).valueOf(), count])
        })
    })
    let timeline_series = []
    $.each(timeline_data, (name, series) => {
        timeline_series.push({
            name: name,
            data: series,
            cursor: 'pointer',
            color: chartColors[name.toLowerCase()],
            marker: {
                symbol: "circle"
            },
            point: {
                events: {
                    click: function () {
                        $("[name='query']").val("date_reported:" + moment.utc(this.x).format("YYYY-MM-DD") + " AND status:" + this.series.name)
                        $("#search_form").submit()
                    }
                }
            },
        })
    })
    let timelineChart = Highcharts.chart('timeline_chart', {
        chart: {
            type: "line",
            zoomType: 'x',
            height: 250
        },
        title: {
            text: ""
        },
        xAxis: {
            type: 'datetime',
            tickInterval: 24 * 3600 * 1000,
            dateTimeLabelFormats: {
                day: '%Y-%m-%d'
            }
        },
        animation: false,
        credits: false,
        series: timeline_series
    });
}

let createStatsChart = (stats) => {
    let chart_stats = []
    $.each(stats, (key, value) => {
        if (key == 'total') { return true }
        chart_stats.push({
            name: key.capitalize(),
            y: value,
            color: chartColors[key]
        })
    })
    console.log(chart_stats)
    let statsChart = Highcharts.chart('stats_chart', {
        chart: {
            type: "pie",
            height: 250
        },
        title: {
            text: ""
        },
        plotOptions: {
            pie: {
                shadow: false,
                center: ['50%', '50%']
            }
        },
        credits: false,
        series: [{
            name: 'Reports',
            animation: false,
            cursor: 'pointer',
            point: {
                events: {
                    click: function () {
                        $("[name='query']").val("status:" + this.name)
                        $("#search_form").submit()
                    }
                }
            },
            innerSize: "60%",
            size: "80%",
            data: chart_stats
        }]
    });
}

$(document).ready(function () {
    $.getJSON('/stats', (stats) => {
        createStatsChart(stats)
    });
    $api.get_timeline()
        .success((data) => { createTimelineChart(data) })
    $("#reports-datatable").DataTable({
        searching: false,
        paging: false,
        lengthChange: false,
        order: [[1, "desc"]],
        columnDefs: [
            {
                "render": function (data, type, row) {
                    return '<a href="/reports/' + data + '">' + data + '</a>'
                },
                "targets": 0
            },
            {
                "render": function (data, type, row) {
                    return moment.utc(data).local().format('MMMM Do YYYY, h:mm:ss a')
                },
                "targets": 1
            },
            {
                "render": function (data, type, row) {
                    return templates.type_icon(data)
                },
                "targets": 3
            },
            {
                "render": function (data, type, row) {
                    return templates.status_label(data);
                },
                "targets": 5
            }
        ]
    });
})

const $api = new API();

let action_cache = []
const load_action = (action_id) => {
	let loaded_action = {}
	$.each(action_cache, (i, action) => {
		if (action.action_id === action_id) {
			loaded_action = action
			return false
		}
	})
	return loaded_action
}

const resetModal = () => {
	$("#name").val("");
	$("#rule_conditions").empty();
	$("#rule_actions").empty();
}

const addCondition = (condition) => {
	let rule_condition_el = $(templates.rule_condition(condition))
	$("#rule_conditions").append(rule_condition_el);
	$("#rule_conditions select").select2({
		width: "100%",
		dropdownParent: $("#rule_modal")
	});
	$(".condition-select2").select2({
		width: "100%", dropdownParent: $("#rule_modal"),
		templateSelection: (condition) => {
			if (!condition.id) { return condition.text; }
			return $("<span>" + $(condition.element).attr('data-label') + "</span>")
		}
	})
	let rule_condition_attribute = $("[name='attribute']").last()
	let rule_condition_matches = $("[name='matches']").last()
	rule_condition_attribute.on('change', function () {
		let conditions_options_el = $(this).parent().siblings(".rule_condition_options")
		conditions_options_el.empty()
		conditions_options_el.append(
			$(templates.rule_condition_options($(this).val(), {}))
		)
	})
	// Setup the options for the new condition
	rule_condition_attribute.trigger('change')
	// Fill in the options for the existing condition, if valid
	if (!_.isEmpty(condition)) {
		rule_condition_attribute.val(condition.attribute).trigger('change');
		let conditions_options_el = rule_condition_attribute.parent().siblings(".rule_condition_options")
		conditions_options_el.find("[name='key']").val(condition['key'])
		conditions_options_el.find("[name='value']").val(condition['value'])
		rule_condition_matches.val(condition['matches']).trigger('change')
	}
};

const loadActionOptions = (el, options) => {
	let rule_action = load_action(el.val());
	let rule_options_el = el.parent().siblings(".action-options");
	rule_options_el.empty();
	$.each(rule_action.options, (option_id, option) => {
		if (option.choices) {
			let option_el = $(templates.rule_option_choice(option_id, option.choices));
			rule_options_el.append(option_el)
			option_el.select2({
				width: "100%",
				dropdownParent: $("#rule_modal")
			})
			if (!_.isEmpty(options)) {
				option_el.val(options[option_id]).trigger('change');
			}
		} else {
			console.log("No options.")
		}
	})
}

const addAction = (action) => {
	$("#rule_actions").append(templates.rule_action(action, action_cache));
	$("#rule_actions select").select2({
		width: "100%",
		dropdownParent: $("#rule_modal")
	});
	let rule_action_select = $("[name='actionName']").last()
	rule_action_select.on('change', function () {
		loadActionOptions($(this), {})
	})
	// Load the initial options
	rule_action_select.trigger("change")
	if (!_.isEmpty(action)) {
		rule_action_select.val(action.action).trigger('change');
		loadActionOptions(rule_action_select, action.options)
	}
};

const edit = (id) => {
	let loadModal = () => {
		resetModal();
		$("#rule_modal").modal('show');
		if (id != -1) {
			$api.get_rule(id)
				.success((rule) => {
					$("#name").val(rule.name);
					$("#rule_conditions").empty();
					$("#rule_actions").empty();
					$("[name='active']").prop('checked', false)
					$.each(rule.conditions, (i, condition) => {
						addCondition(condition);
					});
					$.each(rule.actions, (i, action) => {
						addAction(action);
					});
					if (rule.active) {
						$("[name='active']").prop('checked', true)
					}
				});
		} else {
			$("[name='active']").prop('checked', true)
			if (!$("#rule_conditions").children().length) {
				addCondition({});
			}
			if (!$("#rule_actions").children().length) {
				addAction({});
			}
		}
	}
	$("#rule_form").off("submit")
	$("#rule_form").on("submit", function (e) {
		e.preventDefault();
		save(id);
	});
	if (!action_cache.length) {
		$api.get_actions()
			.success((actions) => {
				action_cache = actions
				loadModal()
			})
	} else {
		loadModal()
	}
}

const save = (id) => {
	let rule = {
		name: $("#name").val(),
		conditions: [],
		actions: [],
		active: false
	}
	if ($("[name='active']")[0].checked) {
		rule.active = true
	}
	// Parse the conditions
	$("#rule_conditions .form-group").each((i, condition) => {
		rule.conditions.push({
			attribute: $(condition).find("[name='attribute']").val(),
			matches: $(condition).find("[name='matches']").val(),
			key: $(condition).find("[name='key']").val(),
			body: $(condition).find("[name='value']").val(),
		});
	});
	$("#rule_actions .form-group").each((i, action_el) => {
		let action = {
			action: $(action_el).find("[name='actionName']").val(),
			options: {}
		}
		$(action_el).find(".action-options input").each((i, option) => {
			let name = $(option).attr('name')
			let val = $(option).val()
			action.options[name] = val
		})
		$(action_el).find(".action-options select").each((i, option) => {
			let name = $(option).attr('name')
			let val = $(option).val()
			action.options[name] = val
		})
		rule.actions.push(action);
	});
	let url = "/rules"
	let text = 'The rule was created successfully'
	if (id != -1) {
		url = url + "/" + id.toString()
		text = 'The rule was updated successfully'
	}
	$.ajax({
		url: url,
		method: 'POST',
		data: JSON.stringify(rule),
		dataType: 'json',
		contentType: "application/json"
	})
		.success((response) => {
			new PNotify({
				title: 'Rule Created',
				text: text,
				type: 'success',
				styling: 'bootstrap3'
			});
			$("#modal_flash").hide();
			$("#rule_modal").modal('hide');
		})
}

const deleteRule = (id) => {
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
				$api.delete_rule(id)
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
			title: 'Rule Deleted',
			text: 'The rule was deleted successfully.',
			type: 'success',
			styling: 'bootstrap3'
		});
	})
}

$(document).ready(() => {
	$('#new_rule_btn').click(() => {
		edit(-1);
	});
	$('#add_condition').click(() => {
		addCondition({});
	});
	$('#add_action').click(() => {
		addAction({});
	});
	$("#rule_form").on("click", ".remove-btn", function () {
		$(this).closest('.form-group').remove();
	});
	$("#rules-datatable").DataTable({
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
});

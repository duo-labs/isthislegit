/* Variable mapping */
const _status_badge_map = {
	'Pending': 'default',
	'Benign': 'success',
	'Malicious': 'danger'
}

const _type_icon_map = {
    'email' : 'envelope-o',
    'url' : 'globe'
}

const _condition_attributes = [
	{
		'label' : 'Header',
		'value' : 'header'
	},
	{
		'label' : 'Body',
		'value' : 'body'
	}
]

/* The underscore templates */
const _status_label = _.template(`<span class="label label-<%- _status_badge_map[status] %>"><%- status %></span>`);

const _type_icon = _.template(`<i class="fa fa-<%- _type_icon_map[type] %>"></i>`);

const _rule_condition = _.template(`
    <div class="form-group rule_condition">
        <div class="row">
            <div class="col-md-2 col-sm-2 col-xs-12">
                <select name="attribute" class="select2">
                    <% _.each(_condition_attributes, (attr)=> { %>
                        <option value="<%- attr.value %>"><%- attr.label %></option>
                    <% }) %>
                </select>
            </div>
            <div class="col-md-2 col-sm-2 col-xs-12">
                <select name="matches" class="select2 condition-select2">
                    <option value="equals" data-label="=">= (Exact Match)</option>
                    <option value="regex" data-label="~=">~= (Regex)</option>
                </select>
            </div>
            <div class="rule_condition_options">
            </div>
			<div class="col-md-1 col-sm-1 col-xs-1">
                <button type="button" class="btn btn-danger remove-btn"><i class="fa fa-trash-o"></i></button>
			</div>
        </div>
    </div>
`);

const _rule_condition_options = (option) => {
    if (option == "body") {
        return `
            <div class="col-md-7 col-sm-7 col-xs-12">
                <input type="text" name="value" placeholder="Value" class="form-control">
            </div>
        `
    } else if (option == "header") {
        return `
            <div class="col-md-3 col-sm-4 col-xs-12">
                <input type="text" name="key" placeholder="Key" class="form-control">
            </div>
            <div class="col-md-4 col-sm-4 col-xs-12">
                <input type="text" name="value" placeholder="Value" class="form-control">
            </div>
        `
    }
}

const _rule_action = _.template(`
    <div class="form-group rule_action">
        <div class="row">
            <div class="col-md-4 col-sm-4 col-xs-12">
                <select name="actionName" class="select2">
                    <% _.each(action_list, (a) => { %>
                        <option value="<%- a.action_id %>"><%- a.name %></option>
                    <% }) %>
                </select>
            </div>
            <div class="action-options col-md-7 col-sm-7 col-xs-12">
            </div>
            <div class="col-md-1 col-sm-1 col-xs-1">
                <button type="button" class="btn btn-danger remove-btn"><i class="fa fa-trash-o"></i></button>
            </div>
        </div>
    </div>
`);

const _rule_option_choice = _.template(`
    <select name="<%- option_id %>" class="select2">
        <% _.each(choices, (choice) => { %>
            <option value="<%- choice %>"><%- choice %></option>
        <% }) %>
    </select>
`);

/* The exported template library */
var templates = {
    status_class: (data) => { return _status_badge_map[data] },
	status_label: (data) => { return _status_label({status: data}) },
    rule_condition: (data) => { return _rule_condition({condition: data}) },
    rule_condition_options: (data) => { return _rule_condition_options(data) },
    rule_action: (action, action_list) => {
        return _rule_action({action: action, action_list: action_list})
    },
    rule_option_choice: (option_id, data) => {
        return _rule_option_choice({option_id: option_id, choices: data})
    },
    type_icon: (data) => { return _type_icon({type: data}) }
}

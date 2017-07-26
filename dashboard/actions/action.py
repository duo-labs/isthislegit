class BaseAction(object):
    """ The base class for an action. This should be subclassed for
    every new Action created.

    At a minimum, every action should have a name, a unique action_id
    (e.g. my_action) and a function `execute` that accepts an EmailReport and options.

    Each Action can specify a dictionary of values to be requested. Validation is
    not currently performed and the options are provided as-is.

    For the values to be requested, you can specify a "name" field as well as a possible
    "choices" field that expects a list of strings. If you want to load the choices
    dynamically, you can specify a "choicesFunc" that is executed on JSON marshalling and
    used to fill the "choices" attributes before returning the action to the user.

    If choices or a choiceFunc is specified, those will be presented as options to the user.
    Otherwise, the UI will provide a generic text field for each option.

    Action authors can also add an optional description (str) field.
    """
    name = ""
    description = ""
    options = {}

    def execute(self, report, options):
        raise NotImplementedError

    @classmethod
    def to_dict(cls, **kwargs):
        options = {}
        for option in cls.options:
            options[option] = {
                "name": cls.options[option]['name'],
            }
            choices = cls.options[option].get('choices')

            choiceFunc = cls.options[option].get('choiceFunc')
            if choiceFunc:
                choices = choiceFunc(**kwargs)

            if choices:
                options[option]['choices'] = choices

        return {
            "name": cls.name,
            "description": cls.description,
            "action_id": cls.action_id,
            "options": options
        }

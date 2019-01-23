# What is an "Action"?

You'll recall from the previous section that IsThisLegit has the concept of Rules that are matched against an email report once it's submitted. Rules have both conditions (what to match on) and actions (what to do when the condition matches).

Actions can do _anything_ - they're just Python code. IsThisLegit comes with a couple of helpful pre-built actions  but the real power comes from developing custom actions. This section will show how easy it is to create your own actions in IsThisLegit by creating a new action that submits all URLs found to VirusTotal and updates the report classification accordingly.

> _Note: There will be an official VirusTotal integration built into IsThisLegit soon._

# Creating the VirusTotal Action

The basic steps to create a new action are:

* Create actual action class
* Import the class

Custom actions live in the `actions/` directory. To create a new action, first create a new file in this folder called `virustotal.py`.

Every action should subclass the `BaseAction` class found in `actions/action.py`. To subclass `BaseAction`, you need to provide a few attributes (as shown below) and implement the `execute()` function, which has the following signature:

```def execute(report, options)```

The `report` argument is the actual `models.EmailReport` instance for the submitted email report. The `options` argument is a dict containing the options submitted to the action. For example, for our action that classifies reports, the options would include the new classification.

With that, let's start building our action.

We can start with some simple boilerplate code for our class:

```python
from actions.action import BaseAction

class VirusTotalAction(BaseAction):
    '''
    Coming soon
    '''
```

_Coming Soon_

# Helpful Utility Modules

While you are free to implement actions however you want, there are a few helpful utility modules (called "service providers") provided by IsThisLegit that you may find helpful in performing common tasks. Most of them are found in the `services/` folder.

## Background Worker

Keep in mind that every action is executed synchronously when a report is submitted. This can be fine for quicker actions (like simply updating a report attribute), but it can hurt the user experience for more complex actions involving reaching out to external services.

To make the user experience more snappy, it's recommended to execute non-critical or slow tasks in the background using the background worker. This is as simple as importing the `services.worker.worker_provider` and starting a background task like this:

```python
worker_provider.add_task(
    function_name,
    arg1, arg2,
    kwarg1=value, kwarg2=value
)
```

The first argument is the function you want to execute, followed by any args/kwargs you want sent as options to the function.

## Sending Email

You may wish to send an email as part of your action.

_Coming Soon_
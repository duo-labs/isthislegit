Responding to reports is a good way to let users know that their report was received and if any further action is required on their end.

There are a couple of ways to respond to reports using IsThisLegit - Quick replies or auto replies using templates and rules.

# Templating Responses

One important thing to note is that you have the ability to use template variables using the Jinja2 syntax in your responses to make the response more personal or specific to the report.

All template variables are off the `report` object. So, to get put the report subject in a response, you can use `{{report.subject}}`.

Here is a list of some useful template variables available for use in responses:

| Field          | Data Type   | Description                                     |
| -------------- | ----------- | ----------------------------------------------- |
| report_type    | string      | The type of report (e.g. "email")               |
| thread_id      | string      | The email thread ID                             |
| history_id     | string      | The email history ID                            |
| date_received  | date        | The date the email was received by the reporter |
| date_reported  | date        | The date the email was reported                 |
| date_responded | date        | The date the first response (status change/email response) was performed |
| has_responded  | string      | Boolean for if the report has been responded to |
| status         | string      | The current report status (e.g. "benign")       |
| sender         | string      | The email address of the email sender           |
| reported_by    | string      | The email address of the reporter               |
| subject        | string      | The email subject                               |
| html           | string      | The email HTML                                  |
| text           | string      | The email text                                  |

# Quick Reply

When viewing a report or list of reports, you can click the "Quick Reply" button to send a quick email to the user who submitted the initial report.

> Note: Make sure the "From" email address used in the quick reply is listed as an authorized sender in the Google App Engine project!

# Using Templates

Templates are a great way to send automatic replies to users as soon as emails are received. This can be helpful in different scenarios:

* If you know that there is an active phishing campaign being sent to multiple users and you want to disseminate that information quickly
* If you are running a simulated phishing campaign and want to congratulate the user for reporting the fake phishing email
* If you want to send an automated response simply letting the user know that their report was received and their efforts are appreciated

To create a new template, navigate to the "Response Templates" page and click on "New Template". This opens up a dialog where you can fill in the details for the template.

`<screenshot for template modal>`

By clicking the "Save" button, you should see a message indicating the template was saved successfully.

_Coming Soon: We will make it possible create fully templated responses which will allow you to use template variables and other more complex logic in your templates_

After a template is created, you'll need to create a rule to send the template. You can refer to the rules documentation for more information, but let's make a wildcard "match-all" rule which will automatically send a template for every report.
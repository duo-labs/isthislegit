Reports can be selected from 3 places: the initial dashboard page, the results page, or from search results.

The tables that list reports contain the following columns:

| Column         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| Report ID      | The ID of the report                                                     |
| Report Date    | The date the report was submitted (in local time)                        |
| Reported By    | The email address of the person who submitted the report                 |
| Type           | The type of report (for the initial release this will only be email)     |
| Subject or URL | The email subject of the report (URL is not used in the initial release) |
| Status         | The current status of the report                                         |

# Viewing a Report

To view a particular report, simply click on the Report ID in the left column of the table. This opens a report view that looks like this:

`<screenshot of report view>`

The report view contains an action bar used to modify or respond to the report, and multiple tabs to aid in analysis of the email.

## Using the Action Bar

The action bar gives analysts the ability to classify reports as Benign, Malicious, or Pending. In addition to this, there is a button to reply to the initial report, which sends an email to the user who submitted the report.

`<screenshot of reply modal>`

## Viewing Email Information

For the initial release of IsThisLegit, the following tabs are available:

### Overview Tab

The overview tab gives a quick overview about the report. It includes a summary containing information such as the person who submitted the report, the time the report was submitted, and the current status. It also contains a timeline, which tracks any changes to the report.

The timeline is particularly useful, since it provides an auditing around modifications to the report. So, if a rule matches the report, if an analyst changes the report status or responds to the report, etc., a timeline event is generated. This makes it easy to go back months later to a previous report and see exactly how the report was handled and by whom.

### Headers Tab

The headers tab gives a table listing of every header/value in the email. In future IsThisLegit versions, this tab will have information about the analysis of the headers, including things like email authentication status.

### Text Tab

The text tab contains the content of the text part of an email.

### HTML Tab

The HTML tab contains a preview of the HTML body, as it would have been seen by the user who reported the email. This view also has a prominent tooltip that appears when hovering over any links in the email, making it easy for analysts to see where links are pointing to in the email.

`<screenshot of HTML tab>`
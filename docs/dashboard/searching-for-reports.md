# Introduction to the Search API

IsThisLegit leverages the [Google App Engine Search API](https://cloud.google.com/appengine/docs/standard/python/search/) to make it easy to find the reports you're looking for.

Every email report is indexed using this API. To search over reports, you can use the search bar in the top right of every page:

<screenshot coming soon>

# Basic Search Syntax

The Search API offers a powerful syntax to search over reports. As a basic rule, you can search using the `field operator value` syntax.

For example, all reports labelled as "malicious" can be found by searching for `status:malicious`. There are many operators to choose from, including :, =, <, >, etc.

Search queries can also be chained using conditionals. So, if I want to find reports on 2017-06-01 labelled as malicious, I could search for `date_reported:2017-06-01 AND status:malicious`.

This search API also offers full-text search without listing the fields. While results may vary, you can search using generic search terms. This makes it easy for searching over the email content using terms that would be found in the content. For example, you could search for `Please login` to find emails with that term in the content.

You can find more information about how to construct search queries [here](https://cloud.google.com/appengine/docs/standard/python/search/query_strings).

# Field Reference

The following fields are available to use when building your search query:

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
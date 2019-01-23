# Introduction to Webhooks

A primary goal of IsThisLegit is to make a tool that fits into the analyst's standard workflow. This requires the ability to easily integrate with other tools. This is currently possible with *webhooks*.

Webhooks give IsThisLegit the ability to send an HTTP request containing the details of an event as it occurs.

# Configuring Webhook URLs

Currently, webhook URLs are configured in the main `isthislegit.toml` configuration file. To add a new URL, simply append the URL to the `url` key under the `webhook` section:

```
[webhook]
provider = "gae"
urls = ['http://localhost:9005/echo']
```

> *Note: For now, keep the provider as "gae", since the application will be running from Google App Engine.*

# Basic Webhook Fields

Webhook requests are sent with a JSON payload in the request body. Each request contains the following fields:

| Field        | Data Type   | Description                                      |
| ------------ | ----------- | ------------------------------------------------ |
| date_created | string      | The datetime the event was created               |
| event_type   | string      | The type of event (e.g. "reported_created")      |
| name         | string      | The name of the event (e.g. "Report Created")    |
| message      | string      | The descriptive event message                    |
| created_by   | string      | Who created the event                            |
| details      | dict        | Any additional details (see "Event Types" below) |

> *Note: All datetimes are provided as UTC*

# Webhook Event Types

This section provides an overview of what actions send a webhook event, and the values expected for the different fields. Some values, like `date_created` and `created_by` are self explanatory, so they are not described here.

Webhook events are sent for the following actions:

## Report Created

Fires when a report is created.

| Field        | Value                                  |
| ------------ | -------------------------------------- |
| event_type   | `report_created`                       |
| name         | Report Created                         |
| message      | <reporter> submitted this report.      |
| details      | `{ "report": <report_as_json> }`       |

## Response Created

Fires when a report is responded to.

| Field        | Value                                                            |
| ------------ | ---------------------------------------------------------------- |
| event_type   | `response_created`                                               |
| name         | Response Created                                                 |
| message      | <responder> responded to this report as <sender>.                |
| details      | `{ "report": <report_as_json>, "response": <response_as_json> }` |

## Report Attribute Changed

Fires when a report attribute (e.g. report status) is changed.

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| event_type   | `report_changed`                                                            |
| name         | Report Changed                                                              |
| message      | <creator> has changed the <attriute> of this report to <value>.             |
| details      | `{ "report": <report_as_json>, "attr": <attribute>, "value": <new value> }` |

## Rule Match

Fires when a rule matches a report.

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| event_type   | `rule_matched`                                                              |
| name         | Rule Matched                                                                |
| message      | Rule <rule_name> matched this report.                                       |
| details      | `{ "report": <report_as_json>, "rule": <rule_as_json> }`                    |

# Example Webhook Request

The following is a sample webhook request body for a "Report Created" webhook event:

```json
{
  "event_type": "report_created",
  "created_by": "john@example.com",
  "name": "Report Created",
  "details": {
    "report": {
      "date_responded": "0001-01-01T00:00:00",
      "reported_domain": "example.com",
      "sender": {
        "address": "attacker@malware.com",
        "name": "Legit Person"
      },
      "thread_id": null,
      "status": "Pending",
      "date_received": "0001-01-01T00:00:00",
      "headers": [
        {
          "value": "1.0",
          "name": "Mime-Version"
        },
        {
          "value": "by 10.1.1.1 with HTTP; Sat, 1 Jul 2017 16:33:22 -0700 (PDT)",
          "name": "Received"
        },
        {
          "value": "Sat, 1 Jul 2017 18:33:22 -0500",
          "name": "Date"
        },
        {
          "value": "john@example.com",
          "name": "Delivered-To"
        },
        {
          "value": "<CADV=M_UPkfjNGigKXdYjthMg@mail.example.com>",
          "name": "Message-Id"
        },
        {
          "value": "This is a sample subject",
          "name": "Subject"
        },
        {
          "value": "Legit Person <attacker@malware.com>",
          "name": "From"
        },
        {
          "value": "John Doe <john@example.com>",
          "name": "To"
        },
        {
          "value": "multipart/alternative",
          "name": "Content-Type"
        }
      ],
      "history_id": null,
      "text": "This is a sample email!\r\n",
      "reported_by": "john@example.com",
      "date_reported": "2017-07-01T23:41:34.676001",
      "report_type": "email",
      "html": "<div dir=\"ltr\">This is a sample email!<div class=\"gmail_signature\" data-smartmail=\"gmail_signature\"><div dir=\"ltr\"><div><div dir=\"ltr\"></div></div></div></div>\r\n</div>\r\n",
      "to": [
        {
          "address": "john@example.com",
          "name": "John Doe"
        }
      ],
      "has_responded": false,
      "subject": "This is a sample subject",
      "events": [],
      "id": "5707702298738688"
    }
  },
  "message": "john@example.com submitted this report.",
  "date_created": "2017-07-01T23:41:34.676001"
}
```
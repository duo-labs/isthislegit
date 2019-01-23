# Introduction to Rules

IsThisLegit gives analysts the ability to create "rules" that do two things:

* Check for a match against a new phishing submission
* If the rules matches, it does _something_.

When IsThisLegit receives a new submission from users, it checks the email against every saved rule to see if the rule matches. If the rule matches, every action in the rule is executed.

At a high level, rules have two parts: **conditions** and **actions**.

`<screenshot of rule modal>`

## Rule Conditions

A rule can have as many conditions as you want. In order for a rule to match a submitted email, _every_ condition has to match.

> Note: You can see if a rule matched a reported email by looking at the email timeline on the Report View.

In the initial release, IsThisLegit supports conditions to match email headers or the email body.

### Matching Headers

Headers can be matched by both the key and the value. Matches can be done by an exact match or a Python regular expression. This is helpful to find campaigns that may share the same headers such as a From address or a particular `X-*` header.

### Matching the Body

The email body can be matched by an exact match or a Python regular expression. This is helpful to find campaigns that may have the same content or perhaps links within the email.

## Rule Actions

After a rule is confirmed to match a reported email, the rule's _actions_ are executed. Rule actions are just short snippets of Python that _do something_. The "something" here can be anything you want! In fact, we have docs showing how simple it is to create your own custom rules for use in IsThisLegit.

The fact that custom rule actions are simple to create makes it really, really easy to integrate IsThisLegit into other parts of your workflow.

For this initial release, these are the actions built-in to IsThisLegit:

### Sending a Template

We talked about templates in a previous section of the documentation. Basically, they're a response email sent to the person who reported the email. You can use this action to automatically send a response when the rule matches the submission.

### Classify Report

Reports can be classified as Benign, Malicious, or Pending. You can use this rule to automatically classify a report based on the conditions matched.

> Note: While we execute rule actions sequentially, they are done via background tasks so there is no guarantee to the order rule actions will execute. It's recommended to avoid "shadowing", where you would have multiple actions that do the same thing. For example, you want to avoid having an action that both classifies a report as Malicious and Benign.

## Rule Activation

You may not always need a rule to be actively being matched against reports. Maybe you want to make a rule and just stash it away for later. A good example of this would be if you're running internal phishing simulations. You may want to have a temporary rule that classifies these particular emails as Benign.

This is done with rule activation, which is just a checkbox on the bottom of the rule dialog. If the checkbox is checked, the rule is activated.
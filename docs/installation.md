# Installation

IsThisLegit contains two parts: the client and the dashboard. These install docs will help you get up and running with both parts of IsThisLegit.

> Note: You don't have to install the IsThisLegit dashboard to use the extension. You can simply setup the extension to forward emails to a predefined inbox if you don't want to setup the dashboard.

<p align="center">
<img src="https://i.imgur.com/imUNYn9.png" width="400">
</p>

## Cloning the Repo

The first step to setting up the project is to clone the repo from Github. You can do this using the following command:

```
git clone https://github.com/duo-labs/isthislegit.git
```

This will clone the contents of the repo into a folder called `isthislegit`.

Next, you need to install the needed Python dependencies. It's recommended to install them to a local `lib/` folder so that Google App Engine can use them when the project is uploaded. You can do that with this command after you `cd` into the `isthislegit/dashboard` folder:

```
pip install -r requirements.txt -t lib/
```

## Installing the Dashboard

The IsThisLegit dashboard is a web application that is responsible for collecting phishing reports. It is also the analyst's window into collected reports, allowing them to view, respond, and categorize reports.

### Setting up the GAE Project

#### Creating the Project

The dashboard is deployed as a Google App Engine project. This means that a new GAE project will need to be created to host your instance of IsThisLegit. You can find instructions on how to do this [here](https://developers.google.com/identity/sign-in/web/devconsole-project), but we repeat them below.

To create a new project, navigate to the [Google Cloud Console](https://console.cloud.google.com/).

From the project drop-down, create a new project by selecting _Create a new project_. You can call this project whatever you want, such as "isthislegit". The project ID will be provided to you.

#### Deploying the Project

It's recommended to deploy the project using the Google Cloud SDK. You can do this using the `gcloud` tool available for your platform.

When the tool is installed and the SDK is setup, setup a new configuration using the following commands:

```
gcloud config configurations create isthislegit-dev
gcloud config configurations activate isthislegit-dev
gcloud config set project isthislegit-XXXXXX
```

To deploy the app, you will need to authorize `gcloud` to use your Google Account. It's very likely you did this when setting up the `gcloud` tool the first time, but if you haven't done this before you can authorize an account by running `gcloud auth`.

Next you need to deploy the application to GAE. You can do this using the command `gcloud app deploy app.yaml index.yaml`

The project should be active! You can navigate to the project using `gcloud app browse`.

**Note: It takes a few minutes for GAE to setup the Datastore indexes used by IsThisLegit. If you get HTTP 500 errors, give it a few minutes and try again.**

## Installing the Extension

The client's job is to make it easy for users to report phishing emails to administrators. This means giving easy usability and sending the email where admins want it to go, whether that's the IsThisLegit dashboard or a mailbox managed by the security team.

For this initial release, IsThisLegit is integrated with Gmail through a Chrome Extension. One of our highest priority next steps is to create and release clients for other major mail providers like Office 365 and Outlook.

The IsThisLegit Chrome extension simply adds a "Report Phishing" button to Gmail that, when clicked, gets the email content using the Gmail API and sends it to either the IsThisLegit dashboard or an inbox of your choice.

<p align="center">
<img src="https://i.imgur.com/iUOl18E.png">
</p>

### Getting the Code

The easiest way to get the code for the extension is to download the latest release from our [Releases](https://github.com/duo-labs/isthislegit/releases) page.

Otherwise, you can clone the repository (see above) and you will have the files you need. However, you'll need to generate a zip file for the release. To do this, it's easiest to run `npm install` to fetch the npm dependencies and then run `gulp release` to build the `isthislegit-extension.zip` file.

### Deploying to the Webstore

For the initial release, you'll need to deploy the extension to the webstore. This may seem like a pain, but we promise it's for good reason.

Since the extension uses the Gmail API to fetch the email from the user's inbox, there has to be an OAuth app created that the user authenticates to. We _could_ setup a single application, share the client details and have everyone authenticate to that app, but that could introduce a single point of failure, and wouldn't let you control all aspects of the extension.

So, you'll first need to get your app up and running in the webstore.

To do this, you'll want to setup an account on the [Chrome Webstore Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard/). Don't let the $5 registration fool you - since you will only be deploying this internally, you won't have to pay the fee 🎊 

Once you have your account setup, click the "Add New Item" button. Here, you can upload the zip file you downloaded earlier.

Once this is uploaded, fill out the self-explanatory details for the application (you don't have to fill out everything). A key thing to note is to select "Private > Everyone at [yourdomain].com" under the "Visibility Options". This restricts the extension to only be installed by people in your GSuite organization.

![](http://i.imgur.com/MrPRh9e.png)

Once the extension is published, you'll be taken to the webstore page for your extension. In the URL, you'll see the 32 character extension ID. We'll want to copy that down for later.

### Creating the OAuth Client

To use the Gmail API, we need to create an OAuth client. If you already installed the dashboard earlier, you can re-use this project, otherwise you'll need to create a new Google Apps Engine project.

You can find information on how to create the OAuth client [here.](https://developer.chrome.com/apps/app_identity#client_id). For the application ID, use the extension ID you copied down earlier after the extension was deployed to the webstore.

After you have your client ID setup, you'll need to add the OAuth details to your manifest. Simply open up the `manifest.json` file (you may need to unzip the extension files to have access to this) in a text editor and add the following to the end (don't forget to put a comma after the `permissions` block!):

```
"oauth2": {
    "client_id": "YOUR CLIENT ID",
    "scopes": [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.send"
    ]
}
```

You can find more information about adding oauth scopes [here](https://developer.chrome.com/apps/app_identity#update_manifest).

Due to the way the Google Webstore handles versioning, you will also need to update the `manifest.json` file with an incremented version number. So, if the version is currently 0.1.0, you can increment it to 0.1.1.

Then, zip up the extension files with the new `manifest.json` and re-upload to the webstore using the same method as before and you should be good to go! The extension is ready to be installed, we just have to push it out using GSuite.

### Pushing to GSuite

The Chrome extension supported managed settings. A sample `settings.json` file is provided that you can use to setup your settings. The options are listed below:

| Field          | Data Type     | Description                                     |
| -------------- | ------------- | ----------------------------------------------- |
| server         | string (Optional) | The URL of the IsThisLegit dashboard listener (e.g. https://project.appspot.com/report/) |
| domains        | array[string]     | The email address domains the button should appear for (if left blank, the button will always appear) |
| forwardAddress | string (Optional) | An email address to forward reports to      |
| deleteOnReport | boolean        | A boolean indicating if the report should be moved to Trash when it is submitted |

After you fill in the values for `settings.json`, you'll need to deploy the app via GSuite.

To do this, navigate to your [GSuite admin console](https://admin.google.com) and navigate to "Device Management" > "Chrome Management" > "App Management". Then, click the 3 dots in the upper right hand corner and select "Add custom app".

<p align="center">
<img src="https://i.imgur.com/6jfBR2r.png" width="400">
</p>

In this dialog, you'll enter the extension ID as well as the Chrome webstore URL for the extension.

After this is saved, open the application entry and select "User Settings". Then, select the organization you want to roll out IsThisLegit to in the left hand sidebar. This will cause the following settings to appear:

<p align="center">
<img src="https://i.imgur.com/LU4eSr7.png" width="400">
</p>

To upload the settings, simply click "Upload Configuration File" and select your `settings.json` file. Optionally, you can force the installation as well with the "Force Installation" setting.

This will roll out the Chrome extension to your users.

> **Important note: When the extension is received by your users, they will be prompted to approve the extension. Additionally, the first time they click "Report Phishing", an OAuth window will appear for them to give your application permission to fetch email on their behalf. This should only happen once. You may wish to let users know this is happening so they are aware when they click the button.**

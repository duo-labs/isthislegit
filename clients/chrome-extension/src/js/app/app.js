/*
app.js

BSD 3-Clause License

Copyright (c) 2017, Duo Labs
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*global chrome*/

import InboxSDK from "inboxsdk"
import $ from "jquery"

const APP_ID = 'sdk_isthislegit_05b10877a3'

/* Class representing a generic button to be added to the Inbox toolbar */
class ReportPhishButton {
    /**
     * Create a new button
     * @param {InboxSDK} sdk - The InboxSDK instance
     */
    constructor(sdk) {
        this.sdk = sdk
        this.iconClass = "icon"
        this.section = this.sdk.Toolbars.SectionNames.INBOX_STATE

        this.onClick = this.onClick.bind(this)
    }

    /**
     * Get the content to use in the modal.
     * @return {html.Element} The HTML element to use in the modal
     */
    get modalContent() {
        let modalElement = $("<span/>")
        modalElement.text(chrome.i18n.getMessage("confirmMessage"))
        return modalElement[0]
    }

    /**
     * Handles the event that fires when the button is clicked by the user
     * @param {event} e - The event context
     */
    onClick(e) {
        let modal = this.sdk.Widgets.showModalView({
            el: this.modalContent,
            title: chrome.i18n.getMessage("confirmTitle"),
            buttons: [
                {
                    text: chrome.i18n.getMessage("confirmPrimaryButton"),
                    type: "PRIMARY_ACTION",
                    onClick: () => {
                        this.SendReport(e)
                        modal.close()
                        this.sdk.Router.goto(this.sdk.Router.NativeRouteIDs.INBOX);
                        this.ShowNotification()
                    }
                },
                {
                    text: chrome.i18n.getMessage("confirmCancelButton"),
                    onClick: () => modal.close()
                }
            ]
        })
    }

    /**
     * Sends a report (assumes implementation by the sublass)
     * @throws {error} An error indicating the subclass hasn't sublcassed the
     * method
     */
    SendReport() {
        throw "Error not implemented"
    }

    /**
     * Sends a report to our event page for processing
     * @param {string} thread_id - The thread_id to report to the IsThisLegit dashboard
     */
    SendReportToBackground(thread_id) {
        chrome.runtime.sendMessage({
            "reported_by": this.sdk.User.getEmailAddress(),
            "message_id": thread_id
        })
    }

    /**
     * Shows a notification to the user using the "ButterBar" styling of InboxSDK
     */
    ShowNotification() {
        this.sdk.ButterBar.showMessage({
            text: "The email has been reported to your security team. Thank you for keeping us secure!"
        })
    }
}


/**
 * Class representing a button to use in the ListView of Gmail
 * @extends ReportPhishButton
 */
class ListReportPhishButton extends ReportPhishButton {
    constructor(sdk) {
        super(sdk)
        this.SendReport = this.SendReport.bind(this)
    }

    /**
     * Sends a report to the IsThisLegit dashboard for every thread
     * currently selected by the user.
     * @param {event} e - The event context (contains a list of selected threads)
     */
    SendReport(event) {
        $.each(event.selectedThreadRowViews, (i, view) => {
            view.getThreadIDAsync().then((thread_id) => {
                this.SendReportToBackground(thread_id)
            })
        })
    }
}


/**
 * Class representing a button to use in the ThreadView of Gmail
 * @extends ReportPhishButton
 */
class ThreadReportPhishButton extends ReportPhishButton {
    constructor(sdk) {
        super(sdk)
        this.SendReport = this.SendReport.bind(this)
    }

    /**
     * Sends a report to the IsThisLegit dashboard for every thread
     * currently selected by the user.
     * @param {event} e - The event context (contains a single thread)
     */
    SendReport(event) {
        event.threadView.getThreadIDAsync().then((thread_id) => {
            this.SendReportToBackground(thread_id)
        })
    }
}

InboxSDK.load('1.0', APP_ID).then((sdk) => {
    let emailAddress = sdk.User.getEmailAddress()
    let emailDomain = emailAddress.substring(emailAddress.lastIndexOf("@") + 1);
    let validDomains = []
    // We want to let administrators configure the email address domains they own, which
    // tells us when to show the button. We need to check if that setting is configured
    // and, if so, that our email address domain is valid.
    chrome.storage.managed.get("domains", (setting) => {
        if (setting.domains) {
            validDomains = setting.domains
        }
        if (validDomains.length && !validDomains.includes(emailDomain)) {
            return
        }
        renderButtons()
    })
    let renderButtons = () => {
        sdk.Toolbars.registerToolbarButtonForList(new ListReportPhishButton(sdk))
        sdk.Toolbars.registerToolbarButtonForThreadView(new ThreadReportPhishButton(sdk))
    }
});
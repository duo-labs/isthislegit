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

/**
 * Extracts the domain from an email address
 * @param {string} emailAddress - The email address
 * @return {string[]} The email local-part and domain
 */
function getEmailParts(emailAddress) {
    let idx = emailAddress.lastIndexOf('@');
    return [emailAddress.substr(0, idx), emailAddress.substr(idx + 1)]
}

/* Class representing a generic button to be added to the Inbox toolbar */
class ReportPhishButton {
    /**
     * Create a new button
     * @param {InboxSDK} sdk - The InboxSDK instance
     */
    constructor(sdk) {
        this.sdk = sdk
        this.title = chrome.i18n.getMessage('reportTitle')
        this.iconUrl = chrome.extension.getURL('dist/img/hook.png')
        this.section = this.sdk.Toolbars.SectionNames.INBOX_STATE
        this.content = this.generateModalContent()

        this.onClick = this.onClick.bind(this)
    }

    /**
     * Get the content to use in the modal.
     * @return {html.Element} The HTML element to use in the modal
     */
    get modalContent() {
        return this.content
    }

    generateModalContent() {
        let modalElement = document.createElement('div')
        let p1 = document.createElement('p')
        p1.innerText = chrome.i18n.getMessage("confirmMessage")
        let p2 = document.createElement('p')
        p2.innerText = chrome.i18n.getMessage("confirmNote")
        let t = document.createElement('textarea')
        t.classList.add('itl-report-textarea')
        modalElement.appendChild(p1)
        modalElement.appendChild(p2)
        modalElement.appendChild(t)
        return modalElement
    }

    /**
     * Handles the event that fires when the button is clicked by the user
     * @param {event} e - The event context
     */
    onClick(e) {
        let textarea = this.modalContent.getElementsByClassName('itl-report-textarea')[0]
        textarea.value = ''

        let modal = this.sdk.Widgets.showModalView({
            el: this.modalContent,
            title: chrome.i18n.getMessage("confirmTitle"),
            buttons: [
                {
                    text: chrome.i18n.getMessage("confirmPrimaryButton"),
                    type: "PRIMARY_ACTION",
                    onClick: () => {
                        this.SendReport(e, textarea.value)
                        modal.close()
                        this.sdk.Router.goto(this.sdk.Router.NativeRouteIDs.INBOX)
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
     * @param {string} note - A user message on the report
     */
    SendReportToBackground(thread_id, note) {
        chrome.runtime.sendMessage({
            "action": "report",
            "reported_by": this.sdk.User.getEmailAddress(),
            "message_id": thread_id,
            "note": note,
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
     * @param {string} note - A user message on the report
     */
    SendReport(event, note) {
        $.each(event.selectedThreadRowViews, (i, view) => {
            view.getThreadIDAsync().then((thread_id) => {
                this.SendReportToBackground(thread_id, note)
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
     * @param {string} note - A user message on the report
     */
    SendReport(event, note) {
        event.threadView.getThreadIDAsync().then((thread_id) => {
            this.SendReportToBackground(thread_id, note)
        })
    }
}

InboxSDK.load('2.0', APP_ID).then((sdk) => {
    let emailAddress = sdk.User.getEmailAddress()
    let [local_part, domain] = getEmailParts(emailAddress)
    let validDomains = []
    // We want to let administrators configure the email address domains they own, which
    // tells us when to show the button. We need to check if that setting is configured
    // and, if so, that our email address domain is valid.
    chrome.storage.managed.get("domains", (setting) => {
        if (setting.domains) {
            validDomains = setting.domains
        }
        if (validDomains.length && !validDomains.includes(domain)) {
            return
        }
        renderButtons()
    })
    let renderButtons = () => {
        sdk.Toolbars.registerToolbarButtonForList(new ListReportPhishButton(sdk))
        sdk.Toolbars.registerToolbarButtonForThreadView(new ThreadReportPhishButton(sdk))
    }
});

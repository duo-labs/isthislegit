/*
service.js

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

import Mime from "mime"
import Base64 from "base64"

const API_URL = 'https://www.googleapis.com/gmail/v1/users/me/'

class IsThisLegitService {
    /**
     * Creates a new instance of the IsThisLegitService
     */
    constructor() {
        this.access_token = null
        this.UpdateSettings = this.UpdateSettings.bind(this)
        this._Send_XHR = this._Send_XHR.bind(this)
        this.ForwardMessage = this.ForwardMessage.bind(this)
        this._API = this._API.bind(this)

        chrome.storage.managed.get(null, (items) => {
            this.settings = items
        })
    }

    /**
     * Updates the managed settings for the extension
     * @param {Object} changes - Object mapping each key that changed to its
     * corresponding storage.StorageChange for that item
     * @param {string} areaName - The name of the storage area
     */
    UpdateSettings(changes, areaName) {
        if (areaName !== 'managed') {
            return
        }
        for (let k in changes) {
            this.settings[k] = changes[k]
        }
    }

    /**
     * Sends a report according to the configured settings
     * @param {object} payload - The JSON payload to process
     */
    SendReport(payload) {
        let reporter = payload.reported_by
        let messageId = payload.message_id
        let processMessage = (message) => {
            if (this.settings.server) {
                this.SendToDashboard(reporter, message)
            }
            if (this.settings.forwardAddress) {
                this.ForwardMessage(reporter, message, messageId)
            }
            if (this.settings.deleteOnReport) {
                this.TrashMessage(messageId)
            }
        }
        this.GetMessage(messageId, processMessage)
    }

    /**
     * Sends a message to the IsThisLegit dashboard
     * @param {string} reporter - The email address of the current user
     * @param {string} message - The message contents to send to the dashboard
     */
    SendToDashboard(reporter, message) {
        let report = {
            'reported_by': reporter,
            'report': message
        }
        this._Send_XHR(
            'POST',
            this.settings.server || 'http://localhost:8080/report/',
            report,
            { 'Content-Type': 'application/json;charset=UTF-8' },
            null)
    }

    /**
     * Forwards a message to the configured address by creating a template email
     * attaching a text file with the original email.
     * @param {string} reporter - The email address of the current user
     * @param {string} message - The message contents to forward
     * @param {string} messageId - The message Id 
     */
    ForwardMessage(reporter, message, messageId) {
        let parsed = Mime.toMimeObj(message)
        let encodedMessage = Base64.encode(message)
        let emailObject = {
            to: this.settings.forwardAddress,
            from: reporter,
            body: chrome.i18n.getMessage("forwardReportBody"),
            subject: chrome.i18n.getMessage("forwardReportSubject") + parsed.subject,
            attaches: [{
                type: "text/plain",
                name: messageId + ".txt",
                base64: encodedMessage
            }]
        }
        let mimeEmail = Mime.toMimeTxt(emailObject)
        let emailContent = { "raw": btoa(mimeEmail).replace(/\//g, '_').replace(/\+/g, '-') }
        this._API(
            'POST', 'messages/send', emailContent,
            (error, status, response) => { }
        )
    }

    /**
     * 
     * @param {string} messageId - The message Id to send to the trash.
     */
    TrashMessage(messageId) {
        this._API(
            'POST', 'messages/' + messageId + '/trash', null,
            (error, status, response) => { }
        )
    }

    /**
     * Fetches an email from the Gmail API
     * @param {string} messageId - The message ID to fetch from the Gmail API
     */
    GetMessage(messageId, callback) {
        this._API(
            'GET', 'messages/' + messageId + '?format=raw', null,
            (error, status, response) => {
                if (error) {
                    return
                }
                let api_response = JSON.parse(response)
                if (!("raw" in api_response)) {
                    return
                }
                let message = atob(api_response.raw.replace(/_/g, '/').replace(/-/g, '+'))
                callback(message)
            })

    }

    /**
     * Sends an AJAX request to the specified URL
     * 
     * @param {string} method - The HTTP method to use when calling the API
     * @param {string} url - The API path to query
     * @param {object} data - Data to send in the HTTP request
     * @param {string} headers - HTTP headers to include in the request
     * @param {function} callback - The callback function to send the API repsonse to
     * 
     * Source: https://github.com/GoogleChrome/chrome-app-samples/blob/master/samples/identity/identity.js#L44
     */
    _Send_XHR(method, url, data, headers, callback) {
        let xhr = new XMLHttpRequest()
        xhr.open(method, url)
        for (let header in headers) {
            if (headers.hasOwnProperty(header)) {
                xhr.setRequestHeader(header, headers[header]);
            }
        }
        xhr.onload = requestComplete
        xhr.send(JSON.stringify(data))

        function requestComplete() {
            if (callback) {
                callback(null, this.status, this.response)
            }
        }
    }

    /**
     * Authenticates and queries the Gmail API 
     * 
     * @param {string} method - The HTTP method to use when calling the API
     * @param {string} path - The API path to query
     * @param {object} data - Data to send in the HTTP request
     * @param {function} callback - The callback function to send the API repsonse to
     */
    _API(method, path, data, callback) {
        let access_token = null
        let retry = true
        let getToken = () => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    /* TODO <jordan-wright>: Remove this once https://bugs.chromium.org/p/chromium/issues/detail?id=722323
                    reaches stable Chrome distribution.

                    For now, on first use, the identity API throws an error.
                    We need to retry getToken() which will call getAuthToken again.

                    We'll only do this once to try and avoid bothering the user in case they did, in fact,
                    refuse the auth.
                    */
                    if (retry && chrome.runtime.lastError.message == "Authorization page could not be loaded.") {
                        console.log("Retrying due to identity api bug.")
                        retry = false
                        getToken()
                        return;
                    }
                    console.log("Received persistent error: ")
                    console.log(chrome.runtime.lastError)
                    return
                }
                access_token = token;
                this._Send_XHR(method, API_URL + path, data,
                    {
                        "Authorization": "Bearer " + access_token,
                        "Content-Type": "application/json; charset=UTF-8"
                    },
                    onRequestComplete);
            })
        }
        let onRequestComplete = (error, status, response) => {
            if (status == 401 && retry) {
                retry = false
                chrome.identity.removeCachedAuthToken({ token: access_token }, getToken)
                return
            }
            callback(error, status, response)
        }
        getToken()
    }

}

const IsThisLegitSvc = new IsThisLegitService();

/* Setup our event listeners */
chrome.storage.onChanged.addListener(IsThisLegitSvc.UpdateSettings)

chrome.runtime.onMessage.addListener((message) => {
    IsThisLegitSvc.SendReport(message)
});
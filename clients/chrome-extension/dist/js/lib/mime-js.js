
/*
    mime-js.js 0.2.0
    2014-10-18

    By Ikrom, https://github.com/ikr0m
    License: X11/MIT
 */

(function () {
    window.Mime = (function () {
        var MailParser, _util, buildMimeObj, toMimeObj, toMimeTxt;
        toMimeTxt = function (mail, txtOnly) {
            var alternative, attaches, cids, createAlternative, createAttaches, createCids, createHtml, createMixed, createPlain, createRelated, getBoundary, htm, linkify, plain, related, result;
            linkify = function (inputText) {
                var replacePattern1, replacePattern2, replacePattern3, replacedText;
                replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
                replacedText = inputText.replace(replacePattern1, "<a href=\"$1\" target=\"_blank\">$1</a>");
                replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
                replacedText = replacedText.replace(replacePattern2, "$1<a href=\"http://$2\" target=\"_blank\">$2</a>");
                replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
                replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');
                return replacedText;
            };
            getBoundary = function () {
                var _random;
                _random = function () {
                    return Math.random().toString(36).slice(2);
                };
                return _random() + _random();
            };
            createPlain = function (textContent) {
                if (textContent == null) {
                    textContent = '';
                }
                return '\nContent-Type: text/plain; charset=UTF-8' + '\nContent-Transfer-Encoding: base64' + '\n\n' + (Base64.encode(textContent, true)).replace(/.{76}/g, "$&\n");
            };
            createHtml = function (msg) {
                var htmlContent;
                htmlContent = msg.body || "";
                htmlContent = htmlContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n/g, '\n<br/>');
                htmlContent = linkify(htmlContent);
                htmlContent = '<div>' + htmlContent + '</div>';
                return '\nContent-Type: text/html; charset=UTF-8' + '\nContent-Transfer-Encoding: base64' + '\n\n' + (Base64.encode(htmlContent, true)).replace(/.{76}/g, "$&\n");
            };
            createAlternative = function (text, html) {
                var boundary;
                boundary = getBoundary();
                return '\nContent-Type: multipart/alternative; boundary=' + boundary + '\n\n--' + boundary + text + '\n\n--' + boundary + html + '\n\n--' + boundary + '--';
            };
            createCids = function (cids) {
                var base64, cid, cidArr, id, j, len, name, type;
                if (!cids) {
                    return;
                }
                cidArr = [];
                for (j = 0, len = cids.length; j < len; j++) {
                    cid = cids[j];
                    type = cid.type;
                    name = cid.name;
                    base64 = cid.base64;
                    id = getBoundary();
                    cidArr.push('\nContent-Type: ' + type + '; name=\"' + name + '\"' + '\nContent-Transfer-Encoding: base64' + '\nContent-ID: <' + id + '>' + '\nX-Attachment-Id: ' + id + '\n\n' + base64);
                }
                return cidArr;
            };
            createRelated = function (alternative, cids) {
                var boundary, cid, j, len, relatedStr;
                if (cids == null) {
                    cids = [];
                }
                boundary = getBoundary();
                relatedStr = '\nContent-Type: multipart/related; boundary=' + boundary + '\n\n--' + boundary + alternative;
                for (j = 0, len = cids.length; j < len; j++) {
                    cid = cids[j];
                    relatedStr += '\n--' + boundary + cid;
                }
                return relatedStr + '\n--' + boundary + '--';
            };
            createAttaches = function (attaches) {
                var attach, base64, id, j, len, name, result, type;
                if (!attaches) {
                    return;
                }
                result = [];
                for (j = 0, len = attaches.length; j < len; j++) {
                    attach = attaches[j];
                    type = attach.type;
                    name = attach.name;
                    base64 = attach.base64;
                    id = getBoundary();
                    result.push('\nContent-Type: ' + type + '; name=\"' + name + '\"' + '\nContent-Disposition: attachment; filename=\"' + name + '\"' + '\nContent-Transfer-Encoding: base64' + '\nX-Attachment-Id: ' + id + '\n\n' + base64);
                }
                return result;
            };
            createMixed = function (related, attaches) {
                var attach, boundary, date, j, len, mailFromName, mimeStr, subject;
                boundary = getBoundary();
                subject = '';
                if (mail.subject) {
                    subject = '=?UTF-8?B?' + Base64.encode(mail.subject, true) + '?=';
                }
                mailFromName = '=?UTF-8?B?' + Base64.encode(mail.fromName || "", true) + '?=';
                date = (new Date().toGMTString()).replace(/GMT|UTC/gi, '+0000');
                mimeStr = 'MIME-Version: 1.0' + '\nDate: ' + date + '\nMessage-ID: <' + getBoundary() + '@mail.your-domain.com>' + '\nSubject: ' + subject + '\nFrom: ' + mailFromName + ' <' + mail.from + '>' + (mail.to ? '\nTo: ' + mail.to : '') + (mail.cc ? '\nCc: ' + mail.cc : '') + '\nContent-Type: multipart/mixed; boundary=' + boundary + '\n\n--' + boundary + related;
                for (j = 0, len = attaches.length; j < len; j++) {
                    attach = attaches[j];
                    mimeStr += '\n--' + boundary + attach;
                }
                return (mimeStr + '\n--' + boundary + '--').replace(/\n/g, '\r\n');
            };
            plain = createPlain(mail.body);
            if (txtOnly) {
                related = plain;
            } else {
                htm = createHtml(mail);
                alternative = createAlternative(plain, htm);
                cids = createCids(mail.cids);
                related = createRelated(alternative, cids);
            }
            attaches = createAttaches(mail.attaches);
            result = createMixed(related, attaches);
            return result;
        };
        MailParser = function (rawMessage) {
            var cc, explodeMessage, from, getValidStr, messageParts, rawHeaders, subject, to;
            explodeMessage = function (inMessage) {
                var escBoundary, i, inBody, inBodyParts, inBoundary, inContentType, inContentTypeParts, inHeaderPos, inRawBody, inRawHeaders, match, mimeType, mimeTypeParts, regContentType, regString, specialChars;
                inHeaderPos = inMessage.indexOf("\r\n\r\n");
                if (inHeaderPos === -1) {
                    inMessage = inMessage.replace(/\n/g, "\r\n");
                    inHeaderPos = inMessage.indexOf("\r\n\r\n");
                    if (inHeaderPos === -1) {
                        inHeaderPos = inMessage.length;
                    }
                }
                inRawHeaders = inMessage.slice(0, inHeaderPos).replace(/\r\n\s+/g, " ") + "\r\n";
                inRawBody = inMessage.slice(inHeaderPos).replace(/(\r\n)+$/, "").replace(/^(\r\n)+/, "");
                inContentType = "";
                regContentType = inRawHeaders.match(/Content-Type: (.*)/i);
                if (regContentType && regContentType.length > 0) {
                    inContentType = regContentType[1];
                } else {
                    console.log("Warning: MailParser: Content-type doesn't exist!");
                }
                inContentTypeParts = inContentType.split(";");
                mimeType = inContentTypeParts[0].replace(/\s/g, "");
                mimeTypeParts = mimeType.split("/");
                if (mimeTypeParts[0].toLowerCase() === "multipart") {
                    inBodyParts = [];
                    match = inContentTypeParts[1].match(/boundary="?([^"]*)"?/i);
                    if (!match && inContentTypeParts[2]) {
                        match = inContentTypeParts[2].match(/boundary="?([^"]*)"?/i);
                    }
                    inBoundary = _util.trim(match[1]).replace(/"/g, "");
                    escBoundary = inBoundary.replace(/\+/g, "\\+");
                    regString = new RegExp("--" + escBoundary, "g");
                    inBodyParts = inRawBody.replace(regString, inBoundary).replace(regString, inBoundary).split(inBoundary);
                    inBodyParts.shift();
                    inBodyParts.pop();
                    i = 0;
                    while (i < inBodyParts.length) {
                        inBodyParts[i] = inBodyParts[i].replace(/(\r\n)+$/, "").replace(/^(\r\n)+/, "");
                        inBodyParts[i] = explodeMessage(inBodyParts[i]);
                        i++;
                    }
                } else {
                    inBody = inRawBody;
                    if (mimeTypeParts[0] === "text") {
                        inBody = inBody.replace(RegExp("=\\r\\n", "g"), "");
                        specialChars = inBody.match(RegExp("=[A-F0-9][A-F0-9]", "g"));
                        if (specialChars) {
                            i = 0;
                            while (i < specialChars.length) {
                                inBody = inBody.replace(specialChars[i], String.fromCharCode(parseInt(specialChars[i].replace(RegExp("="), ""), 16)));
                                i++;
                            }
                        }
                    }
                }
                return {
                    rawHeaders: inRawHeaders,
                    rawBody: inRawBody,
                    body: inBody,
                    contentType: inContentType,
                    contentTypeParts: inContentTypeParts,
                    boundary: inBoundary,
                    bodyParts: inBodyParts,
                    mimeType: mimeType,
                    mimeTypeParts: mimeTypeParts
                };
            };
            messageParts = "";
            try {
                messageParts = explodeMessage(rawMessage);
            } catch (_error) { }
            rawHeaders = messageParts.rawHeaders;
            getValidStr = function (arr) {
                if (arr == null) {
                    arr = [];
                }
                return arr[1] || "";
            };
            subject = getValidStr(/\r\nSubject: (.*)\r\n/g.exec(rawHeaders));
            to = getValidStr(/\r\nTo: (.*)\r\n/g.exec(rawHeaders));
            cc = getValidStr(/\r\nCc: (.*)\r\n/g.exec(rawHeaders));
            from = getValidStr(/\r\nFrom: (.*)\r\n/g.exec(rawHeaders));
            return {
                messageParts: messageParts,
                subject: subject,
                to: to,
                cc: cc,
                from: from
            };
        };
        _util = (function () {
            var KOIRDec, QPDec, _decodeMimeWord, decode, decodeMimeWords, toHtmlEntity, trim, win1251Dec;
            trim = function (str) {
                if (str == null) {
                    str = '';
                }
                return (typeof str.trim === "function" ? str.trim() : void 0) || str.replace(/^\s+|\s+$/g, '');
            };
            decode = function (txt, charset) {
                var result;
                if (txt == null) {
                    txt = '';
                }
                if (charset == null) {
                    charset = '';
                }
                charset = charset.toLowerCase();
                result = (function () {
                    switch (false) {
                        case charset.indexOf('koi8-r') === -1:
                            return KOIRDec(txt);
                        case charset.indexOf('utf-8') === -1:
                            return Base64._utf8_decode(txt);
                        case charset.indexOf('windows-1251') === -1:
                            return win1251Dec(txt);
                        default:
                            return txt;
                    }
                })();
                return result;
            };
            QPDec = function (s) {
                return s.replace(/\=[\r\n]+/g, "").replace(/\=[0-9A-F]{2}/gi, function (v) {
                    return String.fromCharCode(parseInt(v.substr(1), 16));
                });
            };
            KOIRDec = function (str) {
                var charmap, code2char, i, j, len, res, val;
                charmap = unescape("%u2500%u2502%u250C%u2510%u2514%u2518%u251C%u2524%u252C%u2534%u253C%u2580%u2584%u2588%u258C%u2590" + "%u2591%u2592%u2593%u2320%u25A0%u2219%u221A%u2248%u2264%u2265%u00A0%u2321%u00B0%u00B2%u00B7%u00F7" + "%u2550%u2551%u2552%u0451%u2553%u2554%u2555%u2556%u2557%u2558%u2559%u255A%u255B%u255C%u255D%u255E" + "%u255F%u2560%u2561%u0401%u2562%u2563%u2564%u2565%u2566%u2567%u2568%u2569%u256A%u256B%u256C%u00A9" + "%u044E%u0430%u0431%u0446%u0434%u0435%u0444%u0433%u0445%u0438%u0439%u043A%u043B%u043C%u043D%u043E" + "%u043F%u044F%u0440%u0441%u0442%u0443%u0436%u0432%u044C%u044B%u0437%u0448%u044D%u0449%u0447%u044A" + "%u042E%u0410%u0411%u0426%u0414%u0415%u0424%u0413%u0425%u0418%u0419%u041A%u041B%u041C%u041D%u041E" + "%u041F%u042F%u0420%u0421%u0422%u0423%u0416%u0412%u042C%u042B%u0417%u0428%u042D%u0429%u0427%u042A");
                code2char = function (code) {
                    if (code >= 0x80 && code <= 0xFF) {
                        return charmap.charAt(code - 0x80);
                    }
                    return String.fromCharCode(code);
                };
                res = "";
                for (i = j = 0, len = str.length; j < len; i = ++j) {
                    val = str[i];
                    res = res + code2char(str.charCodeAt(i));
                }
                return res;
            };
            win1251Dec = function (str) {
                var i, iCode, j, len, oCode, result, s;
                if (str == null) {
                    str = '';
                }
                result = '';
                for (i = j = 0, len = str.length; j < len; i = ++j) {
                    s = str[i];
                    iCode = str.charCodeAt(i);
                    oCode = (function () {
                        switch (false) {
                            case iCode !== 168:
                                return 1025;
                            case iCode !== 184:
                                return 1105;
                            case !((191 < iCode && iCode < 256)):
                                return iCode + 848;
                            default:
                                return iCode;
                        }
                    })();
                    result = result + String.fromCharCode(oCode);
                }
                return result;
            };
            _decodeMimeWord = function (str, toCharset) {
                var encoding, fromCharset, match;
                str = _util.trim(str);
                fromCharset = void 0;
                encoding = void 0;
                match = void 0;
                match = str.match(/^\=\?([\w_\-]+)\?([QqBb])\?([^\?]*)\?\=$/i);
                if (!match) {
                    return decode(str, toCharset);
                }
                fromCharset = match[1];
                encoding = (match[2] || "Q").toString().toUpperCase();
                str = (match[3] || "").replace(/_/g, " ");
                if (encoding === "B") {
                    return Base64.decode(str, toCharset);
                } else if (encoding === "Q") {
                    return QPDec(str);
                } else {
                    return str;
                }
            };
            decodeMimeWords = function (str, toCharset) {
                str = (str || "").toString().replace(/(=\?[^?]+\?[QqBb]\?[^?]+\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g, "$1").replace(/\=\?([\w_\-]+)\?([QqBb])\?[^\?]*\?\=/g, (function (mimeWord, charset, encoding) {
                    return _decodeMimeWord(mimeWord);
                }).bind(this));
                return decode(str, toCharset);
            };
            toHtmlEntity = function (txt) {
                if (txt == null) {
                    txt = "";
                }
                return (txt + "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            };
            /* Added by jordan-wright 7/22/17
            Fixed non-exported QPDec
            */
            return {
                QPDec: QPDec,
                decode: decode,
                KOIRDec: KOIRDec,
                win1251Dec: win1251Dec,
                decodeMimeWords: decodeMimeWords,
                toHtmlEntity: toHtmlEntity,
                trim: trim
            };
        })();
        buildMimeObj = function (rawMailObj) {
            var body, decodeBody, err, isHtml, isText, mergeInnerMsgs, mimeType, parseBodyParts, parts, readyMail, result, wrapPreTag;
            readyMail = {
                html: "",
                text: "",
                attaches: [],
                innerMsgs: [],
                to: _util.decodeMimeWords(rawMailObj.to),
                cc: _util.decodeMimeWords(rawMailObj.cc),
                from: _util.decodeMimeWords(rawMailObj.from),
                subject: _util.decodeMimeWords(rawMailObj.subject)
            };
            decodeBody = function (body, rawHeaders) {
                var decBody, isBase64, isQP;
                isQP = /Content-Transfer-Encoding: quoted-printable/i.test(rawHeaders);
                isBase64 = /Content-Transfer-Encoding: base64/i.test(rawHeaders);
                if (isBase64) {
                    body = body.replace(/\s/g, '');
                    decBody = typeof atob === "function" ? atob(body) : void 0;
                    if (decBody == null) {
                        decBody = Base64.decode(body);
                    }
                    body = decBody;
                } else if (isQP) {
                    body = _util.QPDec(body);
                }
                return body;
            };
            parseBodyParts = function (bodyParts) {
                var attach, body, innerMsg, isAttach, isAudio, isHtml, isImg, isPlain, isQP, j, k, len, len1, mimeType, name, newMimeMsg, part, rawHeaders, ref, ref1, ref2, regex, slashPos, type, typePart;
                if (!bodyParts) {
                    return;
                }
                for (j = 0, len = bodyParts.length; j < len; j++) {
                    part = bodyParts[j];
                    mimeType = ((ref = part.mimeType) != null ? ref : "").toLowerCase();
                    if (mimeType.indexOf('multipart') !== -1) {
                        parseBodyParts(part.bodyParts);
                        continue;
                    }
                    if (mimeType.indexOf('message/rfc822') !== -1) {
                        newMimeMsg = MailParser(part.rawBody);
                        innerMsg = toMimeObj(newMimeMsg);
                        readyMail.innerMsgs.push(innerMsg);
                        continue;
                    }
                    rawHeaders = part.rawHeaders;
                    isAttach = rawHeaders.indexOf('Content-Disposition: attachment') !== -1;
                    body = part.rawBody;
                    isHtml = /text\/html/.test(mimeType);
                    isPlain = /text\/plain/.test(mimeType);
                    isImg = /image/.test(mimeType);
                    isAudio = /audio/.test(mimeType);
                    if (isAttach || isImg || isAudio) {
                        isQP = /Content-Transfer-Encoding: quoted-printable/i.test(rawHeaders);
                        if (isQP) {
                            body = _util.QPDec(body);
                            body = btoa ? btoa(body) : Base64.encode(body);
                        }
                        ref1 = part.contentTypeParts;
                        for (k = 0, len1 = ref1.length; k < len1; k++) {
                            typePart = ref1[k];
                            if (/name=/i.test(typePart)) {
                                name = typePart.replace(/(.*)=/, '').replace(/"|'/g, '');
                                break;
                            }
                        }
                        if (!name) {
                            name = isImg ? "image" : isAudio ? "audio" : "attachment";
                            name += "_" + Math.floor(Math.random() * 100);
                            slashPos = mimeType.indexOf('/');
                            type = mimeType.substring(slashPos + 1);
                            if (type.length < 4) {
                                name += "." + type;
                            }
                        }
                        regex = /(.*)content-id:(.*)<(.*)>/i;
                        attach = {
                            type: mimeType,
                            base64: body,
                            name: name,
                            cid: (ref2 = regex.exec(rawHeaders)) != null ? ref2[3] : void 0,
                            visible: /png|jpeg|jpg|gif/.test(mimeType)
                        };
                        readyMail.attaches.push(attach);
                    } else if (isHtml || isPlain) {
                        body = decodeBody(body, rawHeaders);
                        body = _util.decode(body, part.contentType);
                        if (isHtml) {
                            readyMail.html += body;
                        }
                        if (isPlain) {
                            readyMail.text += body;
                        }
                    } else {
                        console.log("Unknown mime type: " + mimeType);
                    }
                }
                return null;
            };
            try {
                parts = rawMailObj.messageParts;
                if (!parts) {
                    return readyMail;
                }
                mimeType = (parts.mimeType || "").toLowerCase();
                isText = /text\/plain/.test(mimeType);
                isHtml = /text\/html/.test(mimeType);
                if (mimeType.indexOf('multipart') !== -1) {
                    parseBodyParts(parts.bodyParts);
                } else if (isText || isHtml) {
                    body = decodeBody(parts.body, parts.rawHeaders);
                    body = _util.decode(body, parts.contentType);
                    if (isHtml) {
                        readyMail.html = body;
                    }
                    if (isText) {
                        readyMail.text = body;
                    }
                } else {
                    console.log("Warning: mime type isn't supported! mime=" + mimeType);
                }
            } catch (_error) {
                err = _error;
                throw new Error(err);
            }
            wrapPreTag = function (txt) {
                return "<pre>" + _util.toHtmlEntity(txt) + "</pre>";
            };
            mergeInnerMsgs = function (mail) {
                var htm, innerMsg, innerMsgs, j, len, msg, ref, txt;
                innerMsgs = mail.innerMsgs;
                if (innerMsgs != null ? innerMsgs.length : void 0) {
                    if (!_util.trim(mail.html) && mail.text) {
                        mail.html += wrapPreTag(mail.text);
                    }
                    for (j = 0, len = innerMsgs.length; j < len; j++) {
                        innerMsg = innerMsgs[j];
                        msg = mergeInnerMsgs(innerMsg);
                        txt = msg.text;
                        htm = msg.html;
                        if (htm) {
                            mail.html += htm;
                        } else if (txt) {
                            mail.html += wrapPerTag(txt);
                            mail.text += txt;
                        }
                        if (((ref = msg.attaches) != null ? ref.length : void 0) > 0) {
                            mail.attaches = mail.attaches.concat(msg.attaches);
                        }
                    }
                }
                return mail;
            };
            result = mergeInnerMsgs(readyMail);
            return result;
        };
        toMimeObj = function (mimeMsgText) {
            var mailObj, rawMailObj;
            rawMailObj = MailParser(mimeMsgText);
            mailObj = buildMimeObj(rawMailObj);
            return mailObj;
        };
        console.log(_util)
        return {
            toMimeTxt: toMimeTxt,
            toMimeObj: toMimeObj
        };
    })();
}).call(this);
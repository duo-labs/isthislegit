!function(e){function t(r){if(n[r])return n[r].exports;var s=n[r]={i:r,l:!1,exports:{}};return e[r].call(s.exports,s,s.exports,t),s.l=!0,s.exports}var n={};t.m=e,t.c=n,t.d=function(e,n,r){t.o(e,n)||Object.defineProperty(e,n,{configurable:!1,enumerable:!0,get:r})},t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,"a",n),n},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s=3)}([,,,function(e,t,n){"use strict";function r(e){return e&&e.__esModule?e:{default:e}}function s(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}var o=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),a=n(4),i=r(a),u=n(5),c=r(u),d=function(){function e(){var t=this;s(this,e),this.access_token=null,this.UpdateSettings=this.UpdateSettings.bind(this),this._Send_XHR=this._Send_XHR.bind(this),this.ForwardMessage=this.ForwardMessage.bind(this),this.DispatchMessage=this.DispatchMessage.bind(this),this._API=this._API.bind(this),chrome.storage.managed.get(null,function(e){t.settings=e})}return o(e,[{key:"UpdateSettings",value:function(e,t){if("managed"===t)for(var n in e)this.settings[n]=e[n]}},{key:"DispatchMessage",value:function(e,t,n){switch(e.action){case"report":return this.SendReport(e,t,n);default:console.warn("Invalid action",e.action)}}},{key:"SendReport",value:function(e,t,n){var r=this,s=e.reported_by,o=e.message_id,a=e.note,i=function(e){r.settings.server&&r.SendToDashboard(s,a,e),r.settings.forwardAddress&&r.ForwardMessage(s,a,e,o),r.settings.deleteOnReport&&r.TrashMessage(o)};this.GetMessage(o,i)}},{key:"SendToDashboard",value:function(e,t,n){var r={reported_by:e,note:t,report:n};this._Send_XHR("POST",this.settings.server||"http://localhost:8080/report/",r,{"Content-Type":"application/json;charset=UTF-8"},null)}},{key:"ForwardMessage",value:function(e,t,n,r){var s=i.default.toMimeObj(n),o=c.default.encode(n);t=t||"-None-";var a={to:this.settings.forwardAddress,from:e,body:chrome.i18n.getMessage("forwardReportBody")+t,subject:chrome.i18n.getMessage("forwardReportSubject")+s.subject,attaches:[{type:"text/plain",name:r+".txt",base64:o}]},u=i.default.toMimeTxt(a),d={raw:btoa(u).replace(/\//g,"_").replace(/\+/g,"-")};this._API("POST","messages/send",d,function(e,t,n){})}},{key:"TrashMessage",value:function(e){this._API("POST","messages/"+e+"/trash",null,function(e,t,n){})}},{key:"GetMessage",value:function(e,t){this._API("GET","messages/"+e+"?format=raw",null,function(e,n,r){if(!e){var s=JSON.parse(r);if("raw"in s){var o=atob(s.raw.replace(/_/g,"/").replace(/-/g,"+"));t(o)}}})}},{key:"_Send_XHR",value:function(e,t,n,r,s){function o(){s&&s(null,this.status,this.response)}var a=new XMLHttpRequest;a.open(e,t);for(var i in r)r.hasOwnProperty(i)&&a.setRequestHeader(i,r[i]);a.onload=o,a.send(JSON.stringify(n))}},{key:"_API",value:function(e,t,n,r){var s=this,o=null,a=!0,i=function r(){chrome.identity.getAuthToken({interactive:!0},function(i){if(chrome.runtime.lastError)return a&&"Authorization page could not be loaded."==chrome.runtime.lastError.message?(console.log("Retrying due to identity api bug."),a=!1,void r()):(console.log("Received persistent error: "),void console.log(chrome.runtime.lastError));o=i,s._Send_XHR(e,"https://www.googleapis.com/gmail/v1/users/me/"+t,n,{Authorization:"Bearer "+o,"Content-Type":"application/json; charset=UTF-8"},u)})},u=function(e,t,n){if(401==t&&a)return a=!1,void chrome.identity.removeCachedAuthToken({token:o},i);r(e,t,n)};i()}}]),e}(),l=new d;chrome.storage.onChanged.addListener(l.UpdateSettings),chrome.runtime.onMessage.addListener(l.DispatchMessage)},function(e,t){e.exports=Mime},function(e,t){e.exports=Base64}]);
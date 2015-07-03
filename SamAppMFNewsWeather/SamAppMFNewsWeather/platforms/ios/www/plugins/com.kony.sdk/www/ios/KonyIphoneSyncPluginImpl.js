cordova.define("com.kony.sdk.Impl", function(require, exports, module) { 






var exec = cordova.require('cordova/exec');
exec.setJsToNativeBridgeMode(exec.jsToNativeModes.IFRAME_HASH_NO_PAYLOAD);


var _tempKonyResult = null;
__dbHandle = null;
if (typeof(kony) === "undefined") {
    kony = {};
}
if (typeof(kony.db) === "undefined") {
	kony.db = {};
}
if (typeof(kony.sync) === "undefined") {
	kony.sync = {};
}

if (typeof(kony.net) === "undefined") {
	kony.net = {};
}

if (typeof(kony.crypto) === "undefined") {
	kony.crypto = {};
}

if (typeof(kony.os) === "undefined") {
	kony.os = {};
}

//array designed to hold various callbacks of transaction in a map
kony.db.callbackMap = [];


function openDatabaseSyncSuccessCallBack(dbHandle)  {
    _tempKonyResult = dbHandle;
}

function openDatabaseSyncErrorCallBack(dbHandle)    {
    _tempKonyResult = null;
}

//some params are dummy
kony.db.openDatabaseSync = function (dbName, version, displayName, estimatedSize) {
    if(!__dbHandle) {
        Cordova.exec(openDatabaseSyncSuccessCallBack, openDatabaseSyncErrorCallBack, "KSyncDB", "openDb", [dbName]);
        __dbHandle = _tempKonyResult;
        _tempKonyResult = null;
    }
    return __dbHandle;
}


//some params are dummy
kony.db.openDatabaseSync = function (dbName, version, displayName, estimatedSize, dbKeys) {
	if (!__dbHandle) {
		Cordova.exec(openDatabaseSyncSuccessCallBack, openDatabaseSyncErrorCallBack, "KSyncDB", "openDb", [dbName, dbKeys]);
		__dbHandle = _tempKonyResult;
		_tempKonyResult = null;
	}
	return __dbHandle;
}

kony.db.sqlResultsetRowItem = function(transactionId, resultSet, index){
    if(typeof(resultSet.rowsActual) != "undefined" && resultSet.rowsActual !== null){
        return resultSet.rowsActual[index];
    }
}


konySyncTxCallbackWrapper = function (db) {
               //alert("start of konySyncTxCallbackWrapper");
    try    {
        Cordova.exec(null, null, "KSyncDB", "beginTransaction", []);
        kony.db.callbackMap[0].txc(db);
        return 0;
    } catch(data)    {
        konySyncTxErrorCallbackWrapper(db,data)
    }
}

konySyncTxErrorCallbackWrapper = function (db, res) {
    Cordova.exec(null, null, "KSyncDB", "rollback", []);
    kony.db.callbackMap[0].txec(res);
}

konySyncTxSuccessCallbackWrapper = function (db, res) {
    Cordova.exec(null, null, "KSyncDB", "commit", []);
    kony.db.callbackMap[0].txsc(res);
}

kony.db.transaction = function (connection, transactionCallback, transactionErrorCallback,transactionSuccessCallback) {
    kony.db.callbackMap[0] = {
        "txc" : transactionCallback,
        "txec" : transactionErrorCallback,
        "txsc" : transactionSuccessCallback
    }
    var result = konySyncTxCallbackWrapper(connection)
    if(result == 0) {
        konySyncTxSuccessCallbackWrapper(connection,"success");
    }
}

function executeSqlResultCallBack(result) {
               //alert("konyExecuteSqlResultCallBack_1");
               //alert(JSON.parse(result));
    _tempKonyResult = result;
}



function convertArrayToDict(params)    {
    dictParams = {};
    /*
    if (params instanceof Array && params.length) {
        dictParams[0] = params;
    }
     */
    if(params && params.length) {
        dictParams[0] = params;
    }
    return dictParams;
}

kony.db.executeSql = function (transactionId, SQLStatement, parameters,errorCallback) {
   var params = convertArrayToDict(parameters);
   Cordova.exec(executeSqlResultCallBack, null, "KSyncDB", "executeSql", [transactionId,SQLStatement,params,"executeSqlResultCallBack"]);
    var data = _tempKonyResult;
    _tempKonyResult  = null;
    data = JSON.parse(data);
    if(data && (data.error === "true")){
        delete data.error;
        var res = null;
        if(typeof(errorCallback) != "undefined" && typeof(errorCallback) == "function"){
            res = errorCallback(transactionId,data);
        }
        if(res !== false){
            throw data;
        }
		data = null;
    }
    return data;
}

kony.db.sqlResultsetRowItem = function(transactionId, resultSet, index){
	if(typeof(resultSet.rowsActual) != "undefined" && resultSet.rowsActual !== null){
		return resultSet.rowsActual[index];
	}
}
kony.net.invokeServiceAsync = function(url,inputParamTable,callback,info){

	var httpheaders;
	
	if(typeof(inputParamTable.httpheaders) !== 'undefined' && inputParamTable.httpheaders !== null){
      httpheaders = inputParamTable.httpheaders;
	}
    else{
      httpheaders = {};
    }
	
	function syncServiceCallback(data){
		callback(400, data, info);
	}

	kony.net.networkHelper("post", url, inputParamTable, httpheaders, syncServiceCallback);
}
kony.net.networkHelper = function (requestType, url, params, headers, successCallback, errorCallback) {
	var paramsTable = "";
	var firstVal = true;
	var resultTable = {};
	var httpRequest = new XMLHttpRequest();
	var request = requestType.toUpperCase();
	if(typeof(errorCallback) === 'undefined'){
		errorCallback = successCallback;
	}
	
	if(typeof(params) === 'undefined'){
		params = {};
	}
	httpRequest.onerror = function (res) {
		resultTable["opstatus"] = 1011;
		//resultTable["errcode"] = 1011;
		resultTable["errmsg"] = "An error occurred while making the request. Please check device connectivity, server url and request parameters";
		errorCallback(resultTable);
	};

	httpRequest.onload = function (res) {
		if(res.target.status === 200){
			if(res.target.response !== ""){
				try{
					resultTable = JSON.parse(res.target.response);

				}
				catch(e){
					resultTable.errormsg = res.target.responseText;
				}
			}
			if(!resultTable.opstatus){
				resultTable.opstatus = 0;
			}
			if(resultTable["opstatus"] === 0){
				successCallback(resultTable);	
			}
			else{
				errorCallback(resultTable);
			}
			
		}
		else {
			resultTable["opstatus"] = res.target.status;
			resultTable["message"] = res.target.responseText;
			errorCallback(resultTable);
		}
	};

	httpRequest.ontimeout = function (res) {
		resultTable["opstatus"] = 1;
		resultTable["errcode"] = 1014;
		resultTable["errmsg"] = "Request to server has timed out";
		errorCallback(resulTtable);
	}
	httpRequest.open(request, url, true);
	if (typeof(headers) !== 'undefined' && headers !== null) {
		if (typeof(headers["Content-Type"]) === 'undefined') {
			headers["Content-Type"] = "application/json";
		}
		for (var header in headers) {
			httpRequest.setRequestHeader(header, headers[header]);
		}
	}

	if (typeof(params.httpconfig) !== 'undefined' && params.httpconfig !== null) {
		if (typeof(params.httpconfig.timeout) !== 'undefined' && params.httpconfig.timeout !== null) {
			httpRequest.timeout = params.httpconfig.timeout * 1000;
		}
	}
	try {
		if (request === "POST") {
			for (var key in params) {
				if (!firstVal) {
					paramsTable += "&";
				}
				firstVal = false;
				if (params[key] !== null && typeof(params[key]) != "undefined") {
					paramsTable = paramsTable + key + "=" + encodeURIComponent(params[key]);
				}
			}
			httpRequest.send(paramsTable);
		} else {
			httpRequest.send();
		}
	} catch (e) {
		alert("error occurred " + JSON.stringify(e));
	}

}


kony.crypto.isSupportedAlgo = function (algo) {
	var keywordTable = ["sha1","sha256", "sha384", "sha512", "md2", "md5"];
	for(var i = 0 ; i < keywordTable.length ; i++) {
		if(algo.localeCompare(keywordTable[i]) === 0){
			return true;
		}
	}
	return false;
};

kony.crypto.createHash = function(hashType, text){
	var hash = hashType.toLowerCase();
	if(!kony.crypto.isSupportedAlgo(hash)){
		//unsupported algo error code
		return {"errorCode": 2001 , "errorMessage": "unsupported algorithm"};
	}
    return String(CryptoJS.SHA256(text));
    //TODO now, we are support only sha256
    //TODO add support to other algorithms (sha1, sha512..)
}


kony.os.deviceInfo = function(){
	kony.sync.isPhonegap = true;
	return {name:device.platform,osversion:device.version,model:device.model,deviceid:device.uuid,identifierForVendor:device.uuid}
}
kony.os.userAgent=function(){
    return " " + device.platform + " " + device.model;
}
//To be implemented
kony.os.applicationVersion = function(){
	return;
}

//start of sha256 library
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,s){var f={},t=f.lib={},g=function(){},j=t.Base={extend:function(a){g.prototype=this;var c=new g;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
q=t.WordArray=j.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||u).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=j.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new q.init(c,a)}}),v=f.enc={},u=v.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,
2),16)<<24-4*(b%8);return new q.init(d,c/2)}},k=v.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new q.init(d,c)}},l=v.Utf8={stringify:function(a){try{return decodeURIComponent(escape(k.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return k.parse(unescape(encodeURIComponent(a)))}},
x=t.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=new q.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=l.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var m=0;m<a;m+=e)this._doProcessBlock(d,m);m=d.splice(0,a);c.sigBytes-=b}return new q.init(m,b)},clone:function(){var a=j.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});t.Hasher=x.extend({cfg:j.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){x.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new w.HMAC.init(a,
d)).finalize(c)}}});var w=f.algo={};return f}(Math);
(function(h){for(var s=CryptoJS,f=s.lib,t=f.WordArray,g=f.Hasher,f=s.algo,j=[],q=[],v=function(a){return 4294967296*(a-(a|0))|0},u=2,k=0;64>k;){var l;a:{l=u;for(var x=h.sqrt(l),w=2;w<=x;w++)if(!(l%w)){l=!1;break a}l=!0}l&&(8>k&&(j[k]=v(h.pow(u,0.5))),q[k]=v(h.pow(u,1/3)),k++);u++}var a=[],f=f.SHA256=g.extend({_doReset:function(){this._hash=new t.init(j.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],m=b[2],h=b[3],p=b[4],j=b[5],k=b[6],l=b[7],n=0;64>n;n++){if(16>n)a[n]=
c[d+n]|0;else{var r=a[n-15],g=a[n-2];a[n]=((r<<25|r>>>7)^(r<<14|r>>>18)^r>>>3)+a[n-7]+((g<<15|g>>>17)^(g<<13|g>>>19)^g>>>10)+a[n-16]}r=l+((p<<26|p>>>6)^(p<<21|p>>>11)^(p<<7|p>>>25))+(p&j^~p&k)+q[n]+a[n];g=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&m^f&m);l=k;k=j;j=p;p=h+r|0;h=m;m=f;f=e;e=r+g|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+m|0;b[3]=b[3]+h|0;b[4]=b[4]+p|0;b[5]=b[5]+j|0;b[6]=b[6]+k|0;b[7]=b[7]+l|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;
d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=g.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=g._createHelper(f);s.HmacSHA256=g._createHmacHelper(f)})(Math);

//end of sha256 library
});

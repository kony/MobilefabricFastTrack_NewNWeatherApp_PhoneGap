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

//timer to poll for JSToExecute variable coming from java side
kony.sync.synchronousTimer = null;

kony.sync.startSynchronousTimer = function(){
	kony.sync.synchronousTimer = window.setInterval(function(){kony.sync.execNativeToJS()},3000);
}
		
kony.sync.clearSynchronousTimer = function(){
	window.clearTimeout(kony.sync.synchronousTimer);
}

//array designed to hold various callbacks of transaction in a map
kony.db.callbackMap = [];
//some params are dummy
kony.db.openDatabaseSync = function (dbName, version, displayName, estimatedSize) {
	return Android.openOrCreateDatabase(dbName);
}
konySyncTxCallbackWrapper = function (db) {
	kony.print("in txcallback function");
	try{
	Android.beginTransaction(db);
	kony.db.callbackMap[0].txc(db);
	return 0;
	}catch(err){
		return err;
	}
}

konySyncTxErrorCallbackWrapper = function (db, res) {
	//res = JSON.parse(res);
	Android.endTransaction(db);
	kony.db.callbackMap[0].txec(res);
	kony.sync.clearSynchronousTimer();

}

konySyncTxSuccessCallbackWrapper = function (db, res) {
	//res = JSON.parse(res);
	Android.commitTransaction(db);
	Android.endTransaction(db);
	kony.db.callbackMap[0].txsc(res);
	kony.sync.clearSynchronousTimer();

}

kony.db.transaction = function (connection, transactionCallback, transactionErrorCallback, transactionSuccessCallback) {
	kony.sync.startSynchronousTimer();
	kony.db.callbackMap[0] = {
		"txc" : transactionCallback,
		"txec" : transactionErrorCallback,
		"txsc" : transactionSuccessCallback
	}

	Android.startTransaction(connection, "konySyncTxCallbackWrapper", "konySyncTxErrorCallbackWrapper", "konySyncTxSuccessCallbackWrapper");
}
kony.sync.execNativeToJS = function()
{
	var jsexec = Android.getLatestScriptToExecute();
	if(typeof(jsexec) == "undefined"){
		return;
	}
	try{
	jsexec = JSON.parse(jsexec);
	}
	catch(err){
		kony.sync.clearSynchronousTimer();
		kony.print("in catch block" + err);
	}

/*	var script = jsexec[0];
	var sccesscallback = jsexec[1];
	var errorcallback = jsexec.[2]; */
	
	try{
	var ret = eval(jsexec[0]);
	
	if(ret ===  0){
		eval(jsexec[1]);
	}
	else{
		
		var temp1 = jsexec[2] + "ret)";
		eval(temp1);
	}
	}catch(err){
		kony.sync.clearSynchronousTimer();
		kony.print("error occurred in execution " + err);
	}
}
	

kony.db.executeSql = function (transactionId, SQLStatement, parameters,errorCallback) {
	var params = JSON.stringify(parameters);
	//alert("params are" + params);
	var data =  Android.executeSQL(transactionId, SQLStatement, params);
	data = JSON.parse(data);
	//alert("data returned from executeSql is" + JSON.stringify(data));
	if(data.error == "true"){
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
	switch(hash)
	{
	case "sha1":
	  hash = "sha-1";
	  break;
	case "sha256":
	  hash = "sha-256";
	  break;
	case "sha384":
	  hash = "sha-384";
	  break;
	case "sha512":
	  hash = "sha-512";
	  break;
	default:
	  break;
	}
	
	return Android.digest(text, hash); 
	
}

kony.os.deviceInfo = function(){
	return {name:device.platform,version:device.version,model:device.model,deviceid:device.uuid}
}

kony.os.userAgent = function(){
	return navigator.userAgent;
}

kony.os.applicationVersion = function(){
	return Android.getApplicationVersion();
}	
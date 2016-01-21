/*
  * kony-sdk-phonegap Version 1.0.0.0
  */
        
/**
 * Kony namespace
 * @namespace kony
 */
if (typeof(kony) === "undefined") {
	kony = {};
}

/**
 * Constructor for creating the kony client instance.
 * @class
 * @classdesc kony Class
 * @memberof kony
 */
kony.sdk = function() {
	this.mainRef = {};
	var clientParams = {};
	this.tokens = {};
	this.currentClaimToken = null;
	this.currentBackEndToken = null;
	var userId = "";
	var sessionId = "";

	if (kony.internal && kony.internal.sdk && kony.internal.sdk.Services) {
		this.internalSdkObject = new kony.internal.sdk.Services();
	}

	var localDataStore = new konyDataStore();
	this.getDataStore = function() {
		return localDataStore;
	}
	this.setDataStore = function(dataStore) {
		localDataStore = dataStore;
	}

	this.getUserId = function() {
		return userId;
	}
	this.setCurrentUserId = function(newUserID) {
		userId = newUserID;
	}
	this.getSessionId = function() {
		return sessionId;
	}
	this.setSessionId = function(newSessionId) {
		sessionId = newSessionId;
	}
	this.setClientParams = function(clientParamsMap) {
		clientParams = clientParamsMap;
	}

	this.getClientParams = function() {
		return clientParams;
	}
}

kony.mbaas = kony.sdk;
kony.sdk.isDebugEnabled = true;
kony.sdk.isInitialized = false;
kony.sdk.currentInstance = null;
kony.sdk.isLicenseUrlAvailable = true;

kony.sdk.version = "1.0.0.0";


kony.sdk.getDefaultInstance = function() {
	return kony.sdk.currentInstance;
};

 // This is to be deprecated with getDefaultInstance
kony.sdk.getCurrentInstance = function() {
	return kony.sdk.currentInstance;
};

kony.sdk.claimsRefresh = function(callback, failureCallback) {
	var konyRef = kony.sdk.getCurrentInstance();
	var logger = new konyLogger();
	var networkProvider = new konyNetworkProvider();
	var loginWithAnonymousProvider = function(successCallback, failureCallback) {
		var identityObject = konyRef.getIdentityService("$anonymousProvider");
		identityObject.login(null,
			function(res) {
				successCallback();
			},
			function(res) {
				kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getAuthErrObj(res));
			});
	};

	if (konyRef.currentClaimToken === null) {
		logger.log("claims Token is Unavialable");
		if (konyRef.isAnonymousProvider) {
			loginWithAnonymousProvider(callback, failureCallback);
		} else {
			kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getNullClaimsTokenErrObj());
		}
	} else if (konyRef.claimTokenExpiry && new Date().getTime() > konyRef.claimTokenExpiry) {
		if (konyRef.isAnonymousProvider) {
			loginWithAnonymousProvider(callback, failureCallback);		
		} else {
			logger.log("claims token has expired. fetching new token..")
			var _serviceUrl = stripTrailingCharacter(konyRef.rec.url, "/");
			var _url = _serviceUrl + "/claims";
			logger.log("service url is " + _url);
			if (konyRef.currentRefreshToken === null) {
				kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getNullRefreshTokenErrObj());
			} else {
				networkProvider.post(_url, {}, {
						"Authorization": konyRef.currentRefreshToken,
						"Content-Type": "application/x-www-form-urlencoded"
					}, function(tokens) {
					    tokens = kony.sdk.formatSuccessResponse(tokens);
						logger.log("refresh success..acquiring new tokens");
						konyRef.currentClaimToken = tokens.claims_token.value;
						konyRef.claimTokenExpiry = tokens.claims_token.exp;
						konyRef.currentRefreshToken = tokens.refresh_token;
						callback();
					},
					function(data) {
						logger.log("failed to acquire refresh token");
						/*reset the claims token*/
						konyRef.currentClaimToken = null;
						konyRef.claimTokenExpiry = null;
						konyRef.currentRefreshToken = null;
						//setting the anonymous provider as true to access the public protected urls without any issue
						konyRef.isAnonymousProvider = true;
						kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getAuthErrObj(data));
					});
			}
		}
	} else {
		callback();
	}
};

kony.sdk.prototype.setIntegrationServiceEndpoint = function(serviceName, endPoint) {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before this, else your changes will be overridden when init is called");
	}
	var konyRef = kony.sdk.getCurrentInstance();
	if (!konyRef.integsvc) {
		throw new Exception(Errors.INTEGRATION_FAILURE, "no valid integration services available");
	}
	if (!konyRef.integsvc[serviceName]) {
		throw new Exception(Errors.INTEGRATION_FAILURE, "no valid integration services available for " + serviceName);
	}
	konyRef.integsvc[serviceName] = endPoint;
};

kony.sdk.prototype.setAuthServiceEndpoint = function(providerName, endPoint) {

	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before this, else your changes will be overridden when init is called");
	}

	var konyRef = kony.sdk.getCurrentInstance();

	if (!konyRef.login) {
		throw new Exception(Errors.AUTH_FAILURE, "no valid authentication services available");
	}

	var i = 0;
	for (i = 0; i < konyRef.login.length; i++) {
		var rec = konyRef.login[i];
		if (rec.prov.toUpperCase() === providerName.toUpperCase()) {
			break;
		}
	}

	if (i === konyRef.login.length) {
		throw new Exception(Errors.AUTH_FAILURE, "no valid authentication services available for " + providerName);
	}

	konyRef.login[i].url = endPoint;
};

kony.sdk.prototype.setSyncServiceEndpoint = function(endPoint) {

	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before this, else your changes will be overridden when init is called");
	}

	var konyRef = kony.sdk.getCurrentInstance();

	if (!konyRef.sync) {
		throw new Exception(Errors.SYNC_FAILURE, "no valid sync services available");
	}

	//assuming only one sync service per app
	konyRef.sync.url = endPoint;
}

kony.sdk.prototype.setReportingServiceEndPoint = function(serviceType, endPoint) {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before this, else your changes will be overridden when init is called");
	}

	var konyRef = kony.sdk.getCurrentInstance();
	if (!serviceType) {
		throw new Exception(Errors.METRICS_FAILURE, serviceType + " is not a valid reporting service");
	}
	serviceType = serviceType.toLowerCase();
	if (serviceType === "custom") {
		konyRef.customReportingURL = endPoint;
	} else if (serviceType === "session") {
		konyRef.sessionReportingURL = endPoint;
	} else {
		throw new Exception(Errors.METRICS_FAILURE, serviceType + " is not a valid reporting service");
	}
}

kony.sdk.prototype.setMessagingServiceEndPoint = function(endPoint) {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before this, else your changes will be overridden when init is called");
	}

	var konyRef = kony.sdk.getCurrentInstance();

	if (!konyRef.messagingsvc) {
		throw new Exception(Errors.MESSAGING_FAILURE, "no valid reporting services available");
	}

	konyRef.messagingsvc.url = endPoint;
}

/**
 * Init success callback method.
 * @callback initSuccessCallback
 * @param {json} mainRef - Application Configuration
 */

/**
 * Init failure callback method.
 * @callback initFailureCallback
 */

/**
 * Initialization method for the kony SDK.
 * This method will fetch the app configuration from the kony server and stores in memory.
 * This method has to be invoked before invoking any other SDK methods.
 * @param {string} appKey - Appkey of the kony application
 * @param {string} appSecret - App Secret of the kony application
 * @param {string} serviceUrl - URL of the kony Server
 * @param {initSuccessCallback} successCallback  - Callback method on success
 * @param {initFailureCallback} failureCallback - Callback method on failure
 */
kony.sdk.prototype.init = function(appKey, appSecret, serviceUrl, successCallback, failureCallback) {
	var logger = new konyLogger();
	if (!(appKey && appSecret && serviceUrl)) {
		logger.log("### init:: Invalid credentials passed");
		kony.sdk.verifyAndCallClosure(failureCallback, "Invalid initialization parameters passed. Please check appKey, appSecret and ServiceUrl parameters");
		return;
	}
	var networkProvider = new konyNetworkProvider();
	serviceUrl = serviceUrl.trim();
	this.mainRef.serviceUrl = serviceUrl;
	var konyRef = this;

	logger.log("### init:: calling GET on appConfig to retrieve servicedoc");

	networkProvider.post(
		serviceUrl,
		null, {
			"X-Kony-App-Key": appKey,
			"X-Kony-App-Secret": appSecret,
			"X-HTTP-Method-Override": "GET"
		},
		function(data) {
			data = kony.sdk.formatSuccessResponse(data);
			logger.log("### init::_doInit fetched servicedoc successfuly");
			logger.log("### init:: retrieved data from service doc");
			logger.log(data);
			konyRef.mainRef.config = data;
			konyRef.servicedoc = data;
			konyRef.mainRef.appId = data.appId;
			var processServiceDocResult = konyRef.initWithServiceDoc(appKey, appSecret, data);
			if (processServiceDocResult === true) {
				logger.log("### init::_doInit processing service document successful");
				var svcDataStr = JSON.stringify(data);
				logger.log("### init::_doInit saving done. Calling success callback");
				konyRef.setCurrentUserId("");
				kony.sdk.initiateSession(konyRef);
				if (kony.sdk.metric) {
					kony.sdk.metric.flushEvents();
				}
				var identityObject = kony.sdk.getCurrentInstance().getIdentityService("$anonymousProvider");
				identityObject.login(null,
					function(res) {
						kony.sdk.verifyAndCallClosure(successCallback, konyRef.mainRef);
					},
					function(res) {
						kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getAuthErrObj(res));
					});
			} else {
				logger.log("### init::_doInit processing servicedoc failed. Calling failure callback");
				kony.sdk.verifyAndCallClosure(failureCallback, JSON.stringify(processServiceDocResult));
			}
		},
		function(data) {
			logger.log("### init::_doInit fetching service document from Server failed" + data);
			logger.log("### init::_doInit calling failure callback");
			kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getAuthErrObj(data));
		});
};


kony.sdk.prototype.initWithServiceDoc = function(appKey, appSecret, serviceDoc) {
	konyRef = this;
	kony.sdk.currentInstance = this;
	if (serviceDoc instanceof kony.sdk.serviceDoc) {
		var servConfig = serviceDoc.toJSON();
		processServiceDocMap(servConfig);
	} else {
		return processServiceDocMap(serviceDoc);
	}

	function processServiceDocMap(servConfig) {
		var logger = new konyLogger();


		for (var item in servConfig) {
			if (kony.sdk.isEmptyObject(servConfig[item])) {
				delete servConfig[item];
			}
		}

		logger.log("### init::_doInit::_processServiceDoc" + JSON.stringify(servConfig));
		try {
			konyRef.mainRef.appKey = appKey;
			konyRef.mainRef.appSecret = appSecret;
			konyRef.mainRef.appId = servConfig.appId;

			/* if (!servConfig.baseId) {
				throw new Exception(Errors.INIT_FAILURE, "invalid baseId " + servConfig.baseId);
			} */
			konyRef.mainRef.baseId = servConfig.baseId;

			/* if (!servConfig.name) {
				throw new Exception(Errors.INIT_FAILURE, "invalid name " + servConfig.name);
			} */
			konyRef.mainRef.name = servConfig.name;

			if (servConfig.login) {
				konyRef.login = servConfig.login;
			} else {
				konyRef.login = [];
			}

			var url = servConfig.selflink;
			if (url) {
				var lastPos = url.indexOf("/appconfig");
				if (lastPos != -1) {
					url = url.slice(0, lastPos);
				} else {
					throw new Exception(Errors.INIT_FAILURE, "invalid self link");
				}
				var anonymousLoginProvider = {};
				anonymousLoginProvider.type = "anonymous";
				anonymousLoginProvider.url = url;
				anonymousLoginProvider.prov = "$anonymousProvider";
				konyRef.login.push(anonymousLoginProvider);
			}

			if (typeof(servConfig.integsvc) !== 'undefined') {
				logger.log("### init::_doInit::_processServiceDoc parsing Integration services");
				konyRef.integsvc = servConfig.integsvc;
				logger.log("### init::_doInit::konyRef integration Services" + JSON.stringify(konyRef.integsvc));
			}

			if (typeof(servConfig.messagingsvc) !== 'undefined') {
				logger.log("### init::_doInit::_processServiceDoc parsing Messaging services");
				konyRef.messagingsvc = servConfig.messagingsvc;
			}

			if (typeof(servConfig.sync) !== 'undefined') {
				konyRef.sync = servConfig.sync;
			}
			if(kony.sdk.isLicenseUrlAvailable) {
				if (servConfig.reportingsvc && servConfig.reportingsvc.custom && servConfig.reportingsvc.session) {
					konyRef.customReportingURL = servConfig.reportingsvc.custom;
					konyRef.sessionReportingURL = servConfig.reportingsvc.session;
				} else {
					throw new Exception(Errors.INIT_FAILURE, "invalid url for reporting service");
				}
			}

			if (konyRef.internalSdkObject) {
				konyRef.internalSdkObject.initWithServiceDoc(appKey, appSecret, servConfig);
				if (konyRef.internalSdkObject.setClientParams) {
					konyRef.internalSdkObject.setClientParams(konyRef.getClientParams());
				}
				logger.log("### init::internal sdk object initialized");
			}
			logger.log("### init::_doInit::_processServiceDoc parsing service document done");
			kony.sdk.isInitialized = true;
			return true;
		} catch (err) {
			logger.log("### init::_doInit::_processServiceDoc failed with an exception: " + err);
			return ("processing the ServiceDoc failed with an exception: " + JSON.stringify(err));
		}

	}

};

kony.sdk.prototype.sessionChangeHandler = function(changes) {

	var konyRef = kony.sdk.getCurrentInstance();
	var sessionId = null;
	var userId = null;
	if (changes["sessionId"] != undefined) {
		sessionId = changes["sessionId"];
		konyRef.setSessionId(sessionId);
		if (konyRef.metricsServiceObject && konyRef.metricsServiceObject.setSessionId) {
			konyRef.metricsServiceObject.setSessionId(sessionId);
		}
	}
	if (changes["userId"] != undefined) {
		userId = changes["userId"];
		konyRef.setCurrentUserId(userId);
		if (konyRef.metricsServiceObject && konyRef.metricsServiceObject.setUserId) {
			konyRef.metricsServiceObject.setUserId(userId);
		}
	}
	// if (konyRef.internalSdkObject) {
	// 	//TODO implement across native sdk's ios/andriod
	// 	//konyRef.internalSdkObject.sessionChangeHandler(changes);
	// 	if(sessionId) {
	// 		konyRef.internalSdkObject.setSessionId(sessionId);
	// 	}
	// 	if(userId) {
	// 		konyRef.internalSdkObject.setUserId(userId);
	// 	}
	// }
};

kony.sdk.getSdkType = function() {
	return "js";
}

if (typeof(kony.sdk) === "undefined") {
	kony.sdk = {};
}

if (typeof(kony.sdk.error) === "undefined") {
	kony.sdk.error = {};
}

kony.sdk.error.getAuthErrObj = function(errResponse) {
	if (errResponse && errResponse.httpresponse) {
		delete errResponse.httpresponse;
	}
	if (errResponse && (errResponse.opstatus == 1013 || errResponse.opstatus == 1011)) {
		errResponse["message"] = errResponse["errmsg"];
		delete errResponse.errmsg;
	}
	try {
		var mfcode = errResponse["mfcode"];
		var message = errResponse["message"];
		var details = errResponse["details"];
		if (mfcode) {
			return kony.sdk.error.getMFcodeErrObj(mfcode, message, details, "");
		}
		return errResponse;
	} catch (err) {
		return errResponse;
	}
}

kony.sdk.error.getNullClaimsTokenErrObj = function() {
	var errorObj = {};
	//TODO move error code and constants in to constants.
	errorObj.opstatus = kony.sdk.errorcodes.cliams_token_null
	errorObj.message = kony.sdk.errormessages.cliams_token_null
	errorObj.details = {};
	errorObj.mfcode = "";
	return errorObj;
}

kony.sdk.error.getNullRefreshTokenErrObj = function() {
	var errorObj = {};
	//TODO move error code and constants in to constants.
	errorObj.opstatus = kony.sdk.errorcodes.invalid_session_or_token_expiry
	errorObj.message = kony.sdk.errormessages.invalid_session_or_token_expiry
	errorObj.details = {};
	errorObj.mfcode = "";
	return errorObj;
}

kony.sdk.error.getIntegrationErrObj = function(errResponse) {
	try {
		var mfcode = errResponse["mfcode"];
		var message = errResponse["errmsg"];
		var details = errResponse["mferrmsg"];
		var service = errResponse["service"];
		if (!service) {
			service = "";
		}
		if (!details) {
			details = "";
		}
		var errorMessagePrefixForIntegration = "";
		if (service) {
			errorMessagePrefixForIntegration = "Integration Service Request Failed for " + service + ":";
		} else {
			errorMessagePrefixForIntegration = "Integration Service Request Failed:";
		}
		if (mfcode) {
			return kony.sdk.error.getMFcodeErrObj(mfcode, message, details, errorMessagePrefixForIntegration);
		}
		return errResponse;
	} catch (err) {
		return errResponse;
	}
}

kony.sdk.error.getMFcodeErrObj = function(mfcode, message, details, errMessagePrefix) {
	var errorObj = {};
	errorObj.details = {};
	if (details) {
		errorObj.details = details;
	}
	errorObj.mfcode = mfcode;
	if (mfcode === "Auth-4") {
		if (!message) {
			message = kony.sdk.errormessages.invalid_user_credentials
		}
		errorObj.opstatus = kony.sdk.errorcodes.invalid_user_credentials
		errorObj.message = errMessagePrefix + message;

	} else if (mfcode === "Auth-9") {
		if (!message) {
			message = kony.sdk.errormessages.invalid_app_credentials
		}
		errorObj.opstatus = kony.sdk.errorcodes.invalid_app_credentials
		errorObj.message = errMessagePrefix + message;
	} else if (mfcode === "Auth-3") {
		if (!message) {
			message = kony.sdk.errormessages.invalid_user_app_credentials
		}
		errorObj.opstatus = kony.sdk.errorcodes.invalid_user_app_credentials
		errorObj.message = errMessagePrefix + message;
	} else if ((mfcode === "Auth-5") || (mfcode === "Auth-6") || (mfcode === "Gateway-31") || (mfcode === "Gateway-33") || (mfcode === "Gateway-35") || (mfcode === "Gateway-36") || (mfcode === "Auth-46") || (mfcode === "Auth-55")) {
		errorObj.opstatus = kony.sdk.errorcodes.invalid_session_or_token_expiry
		errorObj.message = errMessagePrefix + kony.sdk.errormessages.invalid_session_or_token_expiry
	} else if (mfcode === "Auth-7" || mfcode === "Auth-27") {
		if (!message) {
			message = errMessagePrefix + kony.sdk.errormessages.invalid_user_app_services
		}
		errorObj.opstatus = kony.sdk.errorcodes.invalid_user_app_services
		errorObj.message = message;
	} else {
		errorObj.opstatus = kony.sdk.errorcodes.default_code
		errorObj.message = errMessagePrefix + kony.sdk.errormessages.default_message
	}
	return errorObj;
}

function getAuthErrorMessage(mfcode) {
	if (mfcode === "Auth-4") {
		return kony.sdk.errormessages.invalid_user_credentials
	} else if (mfcode === "Auth-9") {
		return kony.sdk.errormessages.invalid_app_credentials
	} else if (mfcode === "Auth-3") {
		return kony.sdk.errormessages.invalid_user_app_credentials
	} else if ((mfcode === "Auth-5") || (mfcode === "Auth-6") || (mfcode === "Gateway-31") || (mfcode === "Gateway-33") || (mfcode === "Gateway-35") || (mfcode === "Gateway-36") || (mfcode === "Auth-46") || (mfcode === "Auth-55")) {
		return kony.sdk.errormessages.invalid_session_or_token_expiry
	} else if (mfcode === "Auth-7" || mfcode === "Auth-27") {
		return kony.sdk.errormessages.invalid_user_app_services
	} else {
		return mfcode + ":" + kony.sdk.errormessages.default_message
	}
}
if (typeof(kony.sdk) === "undefined") {
	kony.sdk = {};
}

if (typeof(kony.sdk.errorcodes) === "undefined") {
	kony.sdk.errorcodes = {};
}

if (typeof(kony.sdk.errormessages) === "undefined") {
	kony.sdk.errormessages = {};
}

kony.sdk.errorcodes.invalid_user_credentials = 101;
kony.sdk.errormessages.invalid_user_credentials = "Invalid User Credentials.";

kony.sdk.errorcodes.invalid_app_credentials = 102;
kony.sdk.errormessages.invalid_app_credentials = "Invalid App Credentials.";

kony.sdk.errorcodes.invalid_user_app_credentials = 103;
kony.sdk.errormessages.invalid_user_app_credentials = "Invalid User/App Credentials.";

kony.sdk.errorcodes.invalid_session_or_token_expiry = 104;
kony.sdk.errormessages.invalid_session_or_token_expiry = "Session/Token got invalidated in the backend.Please login.";

kony.sdk.errorcodes.invalid_user_app_services = 105;
kony.sdk.errormessages.invalid_user_app_services = "Invalid provider in appServices.";

kony.sdk.errorcodes.cliams_token_null = 106;
kony.sdk.errormessages.cliams_token_null = "Claims Token is Unavialable";

kony.sdk.errorcodes.default_code = 100;
kony.sdk.errormessages.default_message = "UnhandledMFcode";

kony.sdk.errorcodes.unknown_error_code = 1000;
kony.sdk.errormessages.unknown_error_message = "An unknown error has occured";

kony.sdk.errorcodes.connectivity_error_code = 1011;
kony.sdk.errormessages.connectivity_error_message = "An error occurred while making the request. Please check device connectivity, server url and request parameters";

kony.sdk.errorcodes.invalid_json_code = 1013;
kony.sdk.errormessages.invalid_json_message = "Invalid Json response was returned";

kony.sdk.errorcodes.request_timed_out_code = 1014;
kony.sdk.errormessages.request_timed_out_message = "Request to server has timed out";

/**
 * Method to create the Identity service instance with the provided provider name.
 * @param {string} providerName - Name of the provider
 * @returns {IdentityService} Identity service instance
 */
kony.sdk.prototype.getIdentityService = function(providerName) {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before invoking this service");
	}
	var logger = new konyLogger();
	var provider = null;
	if (providerName) {
		if (this.login != null) {
			for (var i = 0; i < this.login.length; i++) {
				var rec = this.login[i];
				if ((rec.alias && rec.alias.toUpperCase() === providerName.toUpperCase()) || (rec.prov.toUpperCase() === providerName.toUpperCase())) {
					provider = new IdentityService(this, rec);
					break;
				}

			}
			if (provider === null) {
				throw new Exception(Errors.AUTH_FAILURE, "Invalid providerName");
			}
			//TODO: what if the providerName is not passed by the user? 
			logger.log("### auth:: returning authService for providerName = " + provider.getProviderName());
			return provider;
		}
	} else {
		throw new Exception(Errors.AUTH_FAILURE, "Invalid providerName");
	}
};
/**
 * Should not be called by the developer.
 * @class
 * @classdesc Identity service instance for handling login/logout calls.
 */
function IdentityService(konyRef, rec) {
	var logger = new konyLogger();
	var networkProvider = new konyNetworkProvider();
	var serviceObj = rec;
	konyRef.rec = rec;
	var mainRef = konyRef.mainRef;
	if (serviceObj === undefined || serviceObj.prov == undefined || serviceObj.type == undefined) {
		throw new Exception(Errors.INIT_FAILURE, "Invalid service url and service type");
	}

	var _type = serviceObj.type;
	var _serviceUrl = stripTrailingCharacter(serviceObj.url, "/");;
	var _providerName = serviceObj.prov;

	logger.log("### AuthService:: initialized for provider " + _providerName + " with type " + _type);

	var dsKey = _serviceUrl + "::" + _providerName + "::" + _type + "::RAW";

	function resetAllCurrentTokens(konyRef, _providerName) {
		kony.sdk.resetCacheKeys(konyRef, _providerName);
	}

	/**
	 * Login success callback method.
	 * @callback loginSuccessCallback
	 * @param {string} claimsToken - Claims token value
	 */

	/**
	 * Login failure callback method.
	 * @callback loginFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * Login with the given credentials asynchronously and executes the given callback.
	 * @param {object} options - User name and password
	 * @param {loginSuccessCallback} successCallback  - Callback method on success
	 * @param {loginFailureCallback} failureCallback - Callback method on failure
	 */
	this.login = function(options, successCallback, failureCallback) {

		konyRef.isAnonymousProvider = false;
		logger.log("### AuthService::login Invoked login for provider " + _providerName + " of type " + _type);
		if (typeof(options) == 'undefined') {
			throw new Exception(Errors.AUTH_FAILURE, "Missing required number of arguments to login function");
		}

		function invokeAjaxCall(url, params, headers) {

			if (!headers) {
				headers = {};
			}
			headers["X-Kony-App-Key"] = mainRef.appKey;
			headers["X-Kony-App-Secret"] = mainRef.appSecret;
			headers["Accept"] = "application/json";

			var endPointUrl = null;
			if (_type === "anonymous") {
				endPointUrl = _serviceUrl + url;
			} else {
				endPointUrl = _serviceUrl + url + "?provider=" + _providerName;
				params["provider"] = _providerName;
			}

			networkProvider.post(endPointUrl, params, headers,
				function(data) {
					data = kony.sdk.formatSuccessResponse(data);
					logger.log("### AuthService::login successful. Retrieved Data:: ");
					konyRef.tokens[_providerName] = data;
					logger.log("### AuthService::login extracted token. Calling success callback");
					konyRef.currentClaimToken = data.claims_token.value;
					konyRef.currentBackEndToken = data.provider_token;
					konyRef.claimTokenExpiry = data.claims_token.exp;
					konyRef.currentRefreshToken = data.refresh_token;
					if (!konyRef.getUserId() && data.profile) {
						konyRef.setCurrentUserId(data.profile.userid);
					}
					logger.log("userid is " + konyRef.getUserId());
					kony.sdk.verifyAndCallClosure(successCallback, {});
				},
				function(data) {
					logger.log("### AuthService::login login failure. retrieved data:: ");
					logger.log(data);
					logger.log("### AuthService::login Calling failure callback");
					/*resetting all the token in case of error */
					resetAllCurrentTokens(konyRef, _providerName);
					failureCallback(kony.sdk.error.getAuthErrObj(data));
				});
		}

		if (_type === "anonymous") {
			konyRef.isAnonymousProvider = true;
			logger.log("### AuthService::login Adapter type is anonymous ");
			invokeAjaxCall("/login", {}, {
				"Content-Type": "application/x-www-form-urlencoded"
			});
		} else if (_type == "basic") {
			var mandatory_fields = ["userid", "password"];
			if (serviceObj.mandatory_fields && kony.sdk.isArray(serviceObj.mandatory_fields)) {
				mandatory_fields = serviceObj.mandatory_fields;
			}
			for (var i = 0; i < mandatory_fields.length; ++i) {
				if (kony.sdk.isNullOrUndefined(options[mandatory_fields[i]])) {
					throw new Exception(Errors.AUTH_FAILURE, " Require " + mandatory_fields[i]);
				}
			}
			var payload = {};
			for (var option in options) {
				payload[option] = options[option];
			}
			payload["provider"] = _providerName;

			logger.log("### AuthService::login Adapter type is basic ");
			invokeAjaxCall("/login", payload, {
				"Content-Type": "application/x-www-form-urlencoded"
			});
		} else {
			if (options.userid && options.password) {
				var payload = {};
				for(var option in options){
					payload[option] = options[option];
				}
				payload["provider"] = _providerName;
				invokeAjaxCall("/login",payload);
			} else {
				logger.log("### AuthService::login Adapter type is " + _type);
				OAuthHandler(_serviceUrl, _providerName, invokeAjaxCall, _type);
			}
		}
	};
	/**
	 * Logout success callback method.
	 * @callback logoutSuccessCallback
	 */

	/**
	 * Logout failure callback method.
	 * @callback logoutFailureCallback
	 */
	/**
	 * Logout and executes the given callback.
	 * @param {logoutSuccessCallback} successCallback  - Callback method on success
	 * @param {logoutFailureCallback} failureCallback - Callback method on failure
	 */
	this.logout = function(successCallback, failureCallback) {
		function logoutHandler() {
			_logout(successCallback, failureCallback);
		}
		kony.sdk.claimsRefresh(logoutHandler, failureCallback);
	};

	function _logout(successCallback, failureCallback) {
		logger.log("### AuthService::logout invoked on provider " + _providerName + " of type " + _type);
		var claimsTokenValue = null;
		if (konyRef.tokens[_providerName]) {
			claimsTokenValue = konyRef.tokens[_providerName]["claims_token"]["value"];
			delete konyRef.tokens[_providerName];
		}

		networkProvider.post(_serviceUrl + "/logout", {}, {
				"Authorization": claimsTokenValue,
				"Accept" : "*/*"
			},
			function(data) {
				logger.log("AuthService::logout successfully logged out. Calling success callback");
                resetAllCurrentTokens(konyRef, _providerName);
				kony.sdk.verifyAndCallClosure(successCallback, {});
			},
			function(err) {
					logger.log("### AuthService::logout logged out Failed. Calling failure callback");
					kony.sdk.verifyAndCallClosure(failureCallback,kony.sdk.error.getAuthErrObj(err));
			});
	};
	/**
	 * Fetch backend token callback method.
	 * @callback fetchBackendTokenSuccessCallback
	 * @param {string} providerToken - Provider token value
	 */

	/**
	 * Fetch backend token callback method.
	 * @callback fetchBackendTokenFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * Fetch the backend datasource token.
	 * @param {boolean} fromserver - Flag to force fetch from server only.
	 * @param {object} options - Options
	 * @param {fetchBackendTokenSuccessCallback} successCallback  - Callback method on success
	 * @param {fetchBackendTokenFailureCallback} failureCallback - Callback method on failure
	 */
	this.getBackendToken = function(fromserver, options, successCallback, failureCallback) {
		logger.log("### AuthService::getBackendToken called for provider " + _providerName + " of type " + _type);
		if (fromserver != undefined && fromserver === true) {
			logger.log("### AuthService::getBackendToken fromserver is enabled. Trying to login");
			_claimsRefresh(null,
				function(token) {
					konyRef.tokens[_providerName] = token;
					konyRef.currentBackEndToken = token.provider_token;
					kony.sdk.verifyAndCallClosure(successCallback, token.provider_token);
				},
				failureCallback);
		} else {
			if (konyRef.tokens[_providerName]) {
				var val = konyRef.tokens[_providerName];
				var _exp = val.provider_token.exp;
				logger.log("token expiry time: " + _exp);
				logger.log("Current time: " + (new Date().getTime()));
				if (_exp && _exp < (new Date().getTime())) {
					logger.log("### AuthService::getBackendToken Token expired. Fetching refresh from claims api");
					_claimsRefresh(null,
						function(token) {
							konyRef.tokens[_providerName] = token.claims_token.value;
							logger.log("### AuthService::getBackendToken fetching refresh successfull. Calling success callback");
							konyRef.currentBackEndToken = token.provider_token;
							kony.sdk.verifyAndCallClosure(successCallback, token.provider_token);
						},
						function(error) {
							logger.log("### AuthService::getBackendToken fetching refresh failed. Calling failure callback");
							konyRef.tokens[_providerName] = null;
							konyRef.currentBackEndToken = null;
							kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getAuthErrObj(error));
						});
				} else {
					logger.log("### AuthService::getBackendToken present token is valid/doesn't have expiry time. Calling success callback");
					konyRef.currentBackEndToken = val.provider_token;
					kony.sdk.verifyAndCallClosure(successCallback, val.provider_token);
				}
			} else {
				logger.log("### AuthService::getBackendToken failed for find info for key " + dsKey + "in database. calling failure callback");
				kony.sdk.verifyAndCallClosure(failureCallback, null);
			}
		}
	};
	/**
	 * Get profile callback method.
	 * @callback getProfileSuccessCallback
	 * @param {object} profile - Profile object
	 */

	/**
	 * Get profile callback method.
	 * @callback getProfileFailureCallback
	 */
	/**
	 * Get profile.
	 * @param {boolean} fromserver - Flag to force fetch from server only.
	 * @param {getProfileSuccessCallback} successCallback  - Callback method on success
	 * @param {getProfileFailureCallback} failureCallback - Callback method on failure
	 */
	this.getProfile = function(fromserver, successCallback, failureCallback) {
		if (fromserver && fromserver == true) {
			_claimsRefresh(null,
				function(token) {
					konyRef.tokens[_providerName] = token;
					kony.sdk.verifyAndCallClosure(successCallback, token.profile);
				},
				failureCallback)
		} else {
			if (konyRef.tokens[_providerName]) {
				var val = konyRef.tokens[_providerName]
				kony.sdk.verifyAndCallClosure(successCallback, val.profile);
			} else {
				kony.sdk.verifyAndCallClosure(failureCallback, null);
			}
		}
	};
	/**
	 * Get the provider name.
	 * @returns {string} Provider name.
	 */
	this.getProviderName = function() {
		return _providerName;
	};
	/**
	 * Get the provider type.
	 * @returns {string} Provider type.
	 */
	this.getProviderType = function() {
		return _type;
	};

	/**
	 * Get the generic session data type.
	 * @returns {string} session data.
	 */
	this.getUserData = function(successCallback, failureCallback) {
		var userDataUrl = _serviceUrl + "/session/user_data";
		getSessionData(userDataUrl, successCallback, failureCallback);
	};

	/**
	 * Get the user attributes returned by a provider
	 * @returns {string} user attributes.
	 */
	this.getUserAttributes = function(successCallback, failureCallback) {
		var userAttributesUrl = _serviceUrl + "/session/user_attributes?provider=" + _providerName;
		getSessionData(userAttributesUrl, successCallback, failureCallback);
	};

	/**
	 * Get the security attributes returned by a provider
	 * @returns {string} security attributes.
	 */
	this.getSecurityAttributes = function(successCallback, failureCallback) {
		var securityAttributesUrl = _serviceUrl + "/session/security_attributes?provider=" + _providerName;
		getSessionData(securityAttributesUrl, successCallback, failureCallback);
	};

	/**
		utility method to get session data
		@private
	*/
	var getSessionData = function(sessionAttributesEndPointUrl, successCallback, failureCallback) {
		if (konyRef.currentClaimToken === null) {
			kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getNullClaimsTokenErrObj());
		}

		networkProvider.post(sessionAttributesEndPointUrl, {}, {
				"Authorization": konyRef.currentClaimToken,
				"X-HTTP-Method-Override": "GET"
			},
			function(data) {
			    data = kony.sdk.formatSuccessResponse(data);
				kony.sdk.verifyAndCallClosure(successCallback, data);
			},
			function(err) {
				kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getAuthErrObj(err));
			});
	};



	/**
	 * Method to refresh the claims token.
	 * @private
	 */
	var _claimsRefresh = function(options, success, failure) {
		logger.log("### AuthService::_claimsRefresh fetching claims from server for provider " + _providerName);
		var value = konyRef.tokens[_providerName];
		var refreshToken = null;
		if (value) {
			refreshToken = value.refresh_token;
		}
		var _url = _serviceUrl + "/claims";
		if (options && options.requestParams != null) {
			_url = _url + "?"
			for (var i in options.requestParams) {
				if (options.requestParams.hasOwnProperty(i) && typeof(i) !== 'function') {
					_url = _url + (i + "=" + options.requestParams[i] + "&");
				}
			}
			_url = stripTrailingCharacter(_url, "&");
		}
		if (refreshToken) {
			logger.log("### AuthService::_claimsRefresh making POST request to claims endpoint");
			networkProvider.post(_url, {}, {
					"Authorization": refreshToken,
					"Content-Type": "application/x-www-form-urlencoded"
				},
				function(data) {
					data = kony.sdk.formatSuccessResponse(data);
					logger.log("### AuthService::_claimsRefresh Fetching claims succcessfull");
					konyRef.tokens[_providerName] = data;
					logger.log("### AuthService::_claimsRefresh saved locally. Calling success callback");
					kony.sdk.verifyAndCallClosure(success, data);
				},
				function(xhr, status, err) {
					logger.log("### AuthService::_claimsRefresh fetching claims failed. Calling failure callback");
					kony.sdk.verifyAndCallClosure(failure, kony.sdk.error.getAuthErrObj(err));
				});
		} else {
			logger.log("### AuthService::_claimsRefresh no refreshtoken found. calling failure callback");
			kony.sdk.verifyAndCallClosure(failure, kony.sdk.error.getNullRefreshTokenErrObj());
		}
	};
};
stripTrailingCharacter = function(str, character) {
	if (str.substr(str.length - 1) == character) {
		return str.substr(0, str.length - 1);
	}
	return str;
};

var Constants = {
	APP_KEY_HEADER: "X-Kony-App-Key",
	APP_SECRET_HEADER: "X-Kony-App-Secret",
	AUTHORIZATION_HEADER: "Authorization"
};

var Errors = {
	INIT_FAILURE: "INIT_FAILURE",
	DATA_STORE_EXCEPTION: "DATASTORE_FAILURE",
	AUTH_FAILURE: "AUTH_FAILURE",
	INTEGRATION_FAILURE: "INTEGRATION_FAILURE",
	MESSAGING_FAILURE: "MESSAGING_FAILURE",
	SYNC_FAILURE: "SYNC_FAILURE",
	METRICS_FAILURE: "METRICS_FAILURE",
	MISC_FAILURE: "MISCELLANEOUS_FAILURE"
};
kony.sdk.prototype.enableDebug = function() {
	kony.sdk.isDebugEnabled = true;
}

kony.sdk.prototype.disableDebug = function() {
	kony.sdk.isDebugEnabled = false;
}

function Exception(name, message) {
	alert(name + ": " + message);
	return {
		code: name,
		message: message
	};
};

kony.sdk.verifyAndCallClosure = function(closure, params) {
	if (typeof(closure) === 'function') {
		closure(params);
	} else {
		var logger = new konyLogger();
		logger.log("invalid callback");
	}
}

kony.sdk.formatCurrentDate = function(inputDateString) {
	var dateObj = new Date(inputDateString);
	var year = dateObj.getUTCFullYear();
	var month = kony.sdk.formatDateComponent(dateObj.getUTCMonth() + 1);
	var date = kony.sdk.formatDateComponent(dateObj.getUTCDate());
	var hours = kony.sdk.formatDateComponent(dateObj.getUTCHours());
	var minutes = kony.sdk.formatDateComponent(dateObj.getUTCMinutes());
	var seconds = kony.sdk.formatDateComponent(dateObj.getUTCSeconds());
	var dateSeparator = "-"
	var timeSeparator = ":"
	var dateString = year + dateSeparator + month + dateSeparator + date + " " + hours + timeSeparator + minutes + timeSeparator + seconds;
	return dateString;
}

kony.sdk.formatDateComponent = function(dateComponent) {
	if (dateComponent < 10) {
		dateComponent = "0" + dateComponent;
	}
	return dateComponent;
}

kony.sdk.isNullOrUndefined = function(val) {
	if (val === null || val === undefined) {
		return true;
	} else {
		return false;
	}
};

kony.sdk.constants = {
	reportingType: {
		session: "session",
		custom: "custom"
	}
};

kony.sdk.isEmptyObject = function(obj) {
	for (var prop in obj) {
		return false;
	}
	return true;
};


kony.sdk.isArray = function(data) {
	if (data && Object.prototype.toString.call(data) === '[object Array]') {
		return true;
	}
	return false;
}


kony.sdk.formatSuccessResponse = function(data)
{
	if(data && data.httpresponse)
	{
		delete data.httpresponse;
	}
	return data;
}

kony.sdk.isJson = function(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

//private method to identify whether session/token expired or not based on error code
kony.sdk.isSessionOrTokenExpired = function(mfcode) {
	if (mfcode && (mfcode === "Auth-5" || mfcode === "Auth-6" || mfcode === "Gateway-31" || mfcode === "Gateway-33" || mfcode === "Gateway-35" || mfcode === "Gateway-36" || mfcode === "Auth-46" || mfcode === "Auth-55")) {
		return true;
	}
	return false;
}

//private method to clear cache
kony.sdk.resetCacheKeys = function(konyRef, _providerName) {
	try {
		if (konyRef) {
			konyRef.currentClaimToken = null;
			konyRef.currentBackEndToken = null;
			konyRef.claimTokenExpiry = null;
			konyRef.currentRefreshToken = null;
			//setting the anonymous provider as true to access the public protected urls without any issue
			konyRef.isAnonymousProvider = true;
			if (_providerName) {
				if (konyRef.tokens.hasOwnProperty(_providerName)) {
					konyRef.tokens[_providerName] = null;
				}
			}
		}
	} catch(e) {
		var logger = new konyLogger();
		logger.log("Error while clearing the cache..");
	}
}
kony.sdk.serviceDoc = function() {
	var appId = "";
	var baseId = "";
	var name = "";
	var selflink = "";
	var login = null;
	var integsvc = {};
	var reportingsvc = {};
	var messagingsvc = {};
	var sync = {};

	this.toJSON = function() {
		servConfig = {};
		servConfig.appId = this.getAppId();
		servConfig.baseId = this.getBaseId();
		servConfig.name = this.getAppName();
		servConfig.selflink = this.getSelfLink();
		servConfig.login = this.getAuthServices();
		servConfig.integsvc = this.getIntegrationServices();
		servConfig.messagingsvc = this.getMessagingServices();
		servConfig.sync = this.getSyncServices();
		servConfig.reportingsvc = this.getReportingServices();
		return servConfig;
	}

	this.setAppId = function(appIdStr) {
		appId = appIdStr;
	};

	this.getAppId = function() {
		return appId;
	};

	this.setBaseId = function(baseIdStr) {
		baseId = baseIdStr;
	};

	this.getBaseId = function() {
		return baseId;
	};

	this.setAppName = function(appName) {
		name = appName;
	};

	this.getAppName = function() {
		return name;
	};

	this.setSelfLink = function(selfLinkStr) {
		selflink = selfLinkStr;
	};

	this.getSelfLink = function() {
		return selflink;
	};

	function setEndPoints(providerType, providerValues) {
		for (var provider in providerValues) {
			providerType[provider] = providerValues[provider];
		}
	}

	this.setAuthService = function(loginProvider) {
		if(login === null){
			login = [];
		}
		login.push(loginProvider);
	};

	//what will this return? name?
	this.getAuthServiceByName = function(authServiceProvider) {
		if(login === null){
			return null;
		}
		for (var i in login) {
			var provider = login[i];
			if (provider.prov == authServiceProvider) {
				return provider;
			}
		}
	};

	this.getAuthServices = function() {
		return login;
	};

	this.setIntegrationService = function(providerName, endPointUrl) {
		integsvc[providerName] = endPointUrl;
	};

	this.getIntegrationServiceByName = function(integrationServiceProviderName) {
		return integsvc[integrationServiceProviderName];
	};

	this.getIntegrationServices = function() {
		return integsvc;
	};

	this.setReportingService = function(reportingType, url) {
		if (reportingType == kony.sdk.constants.reportingType.session || reportingType == kony.sdk.constants.reportingType.custom) {
			reportingsvc[reportingType] = url;
		} else {
			throw new Exception(Errors.INIT_FAILURE, "invalid reporting type " + reportingType);
		}
	}

	this.getReportingServiceByType = function(reportingServiceProviderType) {
		return reportingsvc[reportingServiceProviderType];
	};

	this.getReportingServices = function() {
		return reportingsvc;
	};

	this.setMessagingService = function(appId, url) {
		messagingsvc[appId] = url;
	};

	this.getMessagingServiceByName = function(messagingServiceProviderName) {
		return messagingsvc[messagingServiceProviderName];
	};

	this.getMessagingServices = function() {
		return messagingsvc;
	}

	this.setSyncService = function(syncServiceProvider) {
		sync = syncServiceProvider;
	};

	this.getSyncServices = function() {
		return sync;
	};

};

/**
 * Method to create the integration service instance with the provided service name.
 * @param {string} serviceName - Name of the service
 * @returns {IntegrationService} Integration service instance
 */
kony.sdk.prototype.getIntegrationService = function(serviceName) {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before invoking this service");
	}
	var konyRef = kony.sdk.getCurrentInstance();
	if (!this.currentClaimToken && !konyRef.isAnonymousProvider) {
		throw new Exception(Errors.AUTH_FAILURE, "Please call login in Identity Service before invoking this service");
	}
	var logger = new konyLogger();
	var integrationService = null;
	if (this.integsvc != null) {
		if (this.integsvc[serviceName] != null) {
			logger.log("found integration service" + this.integsvc[serviceName]);
			return new IntegrationService(this, serviceName);
		}

	}

	throw new Exception(Errors.INTEGRATION_FAILURE, "Invalid serviceName");

};
/**
 * Should not be called by the developer.
 * @class
 * @classdesc Integration service instance for invoking the integration services.
 */
function IntegrationService(konyRef, serviceName) {
	var logger = new konyLogger();
	var dataStore = new konyDataStore();
	var homeUrl = konyRef.integsvc[serviceName];
	var networkProvider = new konyNetworkProvider();
	if (homeUrl == undefined || serviceName == undefined) {
		throw new Exception(Errors.INIT_FAILURE, "Invalid homeUrl and serviceName");
	}
	homeUrl = stripTrailingCharacter(homeUrl, "/");



	this.getUrl = function() {
		return homeUrl;
	};
	/**
	 * Integration service success callback method.
	 * @callback integrationSuccessCallback
	 * @param {json} response - Integration service response
	 */

	/**
	 * Integration service failure callback method.
	 * @callback integrationFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * invoke the specified operation
	 * @param {string} operationName - Name of the operation
	 * @param {object} headers - Input headers for the operation
	 * @param {object} data - Input data for the operation
	 * @param {integrationSuccessCallback} successCallback  - Callback method on success
	 * @param {integrationFailureCallback} failureCallback - Callback method on failure
	 */
	this.invokeOperation = function(operationName, headers, data, successCallback, failureCallback) {
		function invokeOperationHandler() {
			_invokeOperation(operationName, headers, data, successCallback, failureCallback);
		}
		kony.sdk.claimsRefresh(invokeOperationHandler, failureCallback);
	};

	function _invokeOperation(operationName, headers, data, successCallback, failureCallback) {
		var metricsData = kony.sdk.getPayload(konyRef);
		metricsData.svcid = operationName;
		var dataToSend = {};
		dataToSend.konyreportingparams = JSON.stringify(metricsData);

		for (var key in data) {
			dataToSend[key] = data[key];
		}

		var token;
		for (var i in konyRef.tokens) {
			if (konyRef.tokens.hasOwnProperty(i) && typeof(i) !== 'function') {
				token = konyRef.tokens[i];
				break;
			}
		}

		var defaultHeaders = {
			"Content-Type": "application/x-www-form-urlencoded",
			"X-Kony-Authorization": konyRef.currentClaimToken
		}

		// if the user has defined his own headers, use them
		if (headers) {
			for (var header in headers) {
				defaultHeaders[header] = headers[header];
			}
		}

		logger.log("request data is " + JSON.stringify(dataToSend));

		networkProvider.post(homeUrl + "/" + operationName,
			dataToSend, defaultHeaders,
			function(res) {
				kony.sdk.verifyAndCallClosure(successCallback, res);
			},
			function(xhr, status, err) {
				if (xhr && !(status && err)) {
					err = xhr;
				}
				if(err["mfcode"]){
					var konyRef = kony.sdk.getCurrentInstance();
					//clear the cache if the error code related to session/token expiry
					if (kony.sdk.isSessionOrTokenExpired(err["mfcode"])) {
						kony.sdk.resetCacheKeys(konyRef);
					}
				}				
				kony.sdk.verifyAndCallClosure(failureCallback, kony.sdk.error.getIntegrationErrObj(err));
			});
	};

};
/**
 * Method to create the messaging service instance.
 * @returns {MessagingService} Messaging service instance
 */
kony.sdk.prototype.getMessagingService = function() {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before invoking this service");
	}
	return new MessagingService(this);
}

/**
 * Should not be called by the developer.
 * @class
 * @classdesc Messaging service instance for invoking the Messaging services.
 *@param reference to kony object
 */
function MessagingService(konyRef) {

	var homeUrl = konyRef.messagingsvc.url;
	var KSID;
	var appId = konyRef.messagingsvc.appId;
	var logger = new konyLogger();
	var networkProvider = new konyNetworkProvider();
	var dsKey = homeUrl + ":KMS:AppId";

	this.getUrl = function() {
		return homeUrl;
	};

	this.setKSID = function(ksid) {
		konyRef.getDataStore().setItem(dsKey, ksid);
		KSID = ksid;
	};

	this.getKSID = function() {
		if (!KSID) {
			KSID = konyRef.getDataStore().getItem(dsKey);
		}
		return KSID;
	};

	this.setKmsAppId = function(id) {
		appId = id;
	};

	this.getKmsAppId = function() {
		return appId;
	};
	/**
	 * register success callback method.
	 * @callback registerSuccessCallback
	 * @param {json} response - register response
	 */

	/**
	 * Register service failure callback method.
	 * @callback registerFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * register to messaging service
	 * @param {string} osType - Type of the operating system
	 * @param {string} deviceId - Device Id
	 * @param {string} pnsToken - Token value
	 * @param {registerSuccessCallback} successCallback - Callback method on success
	 * @param {registerFailureCallback} failureCallback - Callback method on failure
	 */
	this.register = function(osType, deviceId, pnsToken, email, successCallback, failureCallback) {
		if (typeof(pnsToken) === 'undefined' || pnsToken === null) {
			throw new Exception(Errors.MESSAGING_FAILURE, "Invalid pnsToken/sId. Please check your messaging provider");
		}
		if (typeof(osType) === 'undefined' || osType === null) {
			throw new Exception(Errors.MESSAGING_FAILURE, "Invalid osType.");
		}
		if (typeof(deviceId) === 'undefined' || deviceId === null) {
			throw new Exception(Errors.MESSAGING_FAILURE, "Invalid deviceId.");
		}
		if (typeof(email) === 'undefined' || email === null) {
			throw new Exception(Errors.MESSAGING_FAILURE, "Invalid email.");
		}
		var uri = homeUrl + "/subscribers";
		jsonParam = {
			"subscriptionService": {
				"subscribe": {
					"sid": pnsToken,
					"appId": this.getKmsAppId(),
					"ufid": email,
					"osType": osType,
					"deviceId": deviceId
				}
			}
		};

		var headers = {
			"Content-Type": "application/json"
		};
        var payload = {
			postdata : JSON.stringify(jsonParam)
		}
		logger.log(JSON.stringify(jsonParam));
		networkProvider.post(uri,
			payload,
			headers,
			function(data) {
				KSID = data.id;
				konyRef.getDataStore().setItem(dsKey, KSID);
				logger.log("Device registered to KMS with KSID:" + KSID);
				kony.sdk.verifyAndCallClosure(successCallback, data);
			},
			function(data, status, error) {

				logger.log("ERROR: Failed to subscribe device for KMS");
				var errorObj = {};
				errorObj.data = data;
				errorObj.status = status;
				errorObj.error = error;
				kony.sdk.verifyAndCallClosure(failureCallback, errorObj);
			});
	};
	/**
	 * unregister success callback method.
	 * @callback unregisterSuccessCallback
	 */

	/**
	 * unregister service failure callback method.
	 * @callback unregisterFailureCallback
	 */
	/**
	 * unregister to messaging service
	 * @param {unregisterSuccessCallback} successCallback - Callback method on success
	 * @param {unregisterFailureCallback} failureCallback - Callback method on failure
	 */
	this.unregister = function(successCallback, failureCallback) {
		var uri = homeUrl + "/subscribers/" + this.getKSID();
		logger.log("unsubscribe uri:" + uri);
		konyRef.getDataStore().removeItem(dsKey);
		var headers = {
			"Content-Type": "application/json",
			"X-HTTP-Method-Override": "DELETE"
		};
		networkProvider.post(uri, null, headers, successCallback, failureCallback);
	};
	/**
	 * Fetch all messages success callback method.
	 * @callback fetchAllMessagesSuccessCallback
	 * @param {json} response - Fetch all messages response
	 */

	/**
	 * Fetch all messages service failure callback method.
	 * @callback fetchAllMessagesFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * Fetch all messages
	 * @param {fetchAllMessagesSuccessCallback} successCallback - Callback method on success
	 * @param {fetchAllMessagesFailureCallback} failureCallback - Callback method on failure
	 */
	this.fetchAllMessages = function(startIndex, pageSize, successCallback, failureCallback) {
		var uri = homeUrl + "/messages/fetch";
		var headers = {
			"Content-Type": "application/json"
		};
		var data = {
			"ksid": this.getKSID(),
			"startElement": startIndex,
			"elementsPerPage": pageSize
		};
        var payload = {
			postdata : JSON.stringify(data)
		}
		networkProvider.post(uri, payload, headers, successCallback, failureCallback);
	};
	/**
	 * Update location service success callback method.
	 * @callback updateLocationSuccessCallback
	 * @param {json} response - Update location response
	 */

	/**
	 * Update location service failure callback method.
	 * @callback updateLocationFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * Update the location
	 * @param {string} latitude - Latitude value
	 * @param {string} longitude - Longitude value
	 * @param {string} locationName - Location name
	 * @param {updateLocationSuccessCallback} successCallback - Callback method on success
	 * @param {updateLocationFailureCallback} failureCallback - Callback method on failure
	 */
	this.updateGeoLocation = function(latitude, longitude, locationName, successCallback, failureCallback) {
		if (typeof(latitude) === 'undefined' || latitude === null) {
			throw new Exception(MESSAGING_FAILURE, "invalid latitude paramter value");
		}
		if (typeof(longitude) === 'undefined' || longitude === null) {
			throw new Exception(MESSAGING_FAILURE, "invalid longitude paramter value");
		}
		if (typeof(locationName) === 'undefined' || locationName === null) {
			throw new Exception(MESSAGING_FAILURE, "invalid locationName paramter value");
		}
		var headers = {
			"Content-Type": "application/json"
		};
		var uri = homeUrl + "/location";
		var data = {
			"ksid": this.getKSID(),
			"latitude": latitude,
			"locname": locationName,
			"longitude": longitude
		};
		var payload = {
			postdata : JSON.stringify(data)
		}
		logger.log("updateLocation payload: " + JSON.stringify(payload));
		networkProvider.post(uri, payload, headers, successCallback, failureCallback);
	};
	/**
	 * Mark meesage as read service success callback method.
	 * @callback markReadSuccessCallback
	 * @param {json} response - Mark meesage as read service response
	 */
	/**
	 * Mark meesage as read service failure callback method.
	 * @callback markReadFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * Mark the message as read for a given message id
	 * @param {string} messageId - Message id
	 * @param {markReadSuccessCallback} successCallback - Callback method on success
	 * @param {markReadFailureCallback} failureCallback - Callback method on failure
	 */
	this.markMessageRead = function(fetchId, successCallback, failureCallback) {
		if (typeof(fetchId) === 'undefined' || fetchId === null) {
			throw new Exception(MESSAGING_FAILURE, "invalid fetchId paramter value");
		}
		var headers = {
			"Content-Type": "application/json"
		};
		var uri = homeUrl + "/messages/open/" + fetchId;
		networkProvider.get(uri, null, headers, successCallback, failureCallback);

	};
	/**
	 * Message content service success callback method.
	 * @callback messageContentSuccessCallback
	 * @param {json} response - Message content service response
	 */
	/**
	 * Message content service failure callback method.
	 * @callback messageContentFailureCallback
	 * @param {json} error - Error information
	 */
	/**
	 * Fetches the message conetent for a given message id
	 * @param {string} messageId - Message id
	 * @param {messageContentSuccessCallback} successCallback - Callback method on success
	 * @param {messageContentFailureCallback} failureCallback - Callback method on failure
	 */
	this.fetchMessageContent = function(fetchId, successCallback, failureCallback) {
		if (typeof(fetchId) === 'undefined' || fetchId === null) {
			throw new Exception(MESSAGING_FAILURE, "invalid fetchId paramter value");
		}
		var headers = {
			"Content-Type": "application/json"
		};
		var uri = homeUrl + "/messages/content/" + fetchId;
		networkProvider.get(uri, null, headers, successCallback, failureCallback);
	};
};
/**
 * Method to create the Reporting service instance with the provided service name.
 * @returns {ReportingService} Reporting service instance
 */
kony.sdk.prototype.getReportingService = function() {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before invoking this service");
	}
	return new ReportingService(this);
};
/**
 * Should not be called by the developer.
 * @class
 * @classdesc Reporting service instance for invoking the reporting services.
 */
function ReportingService(konyRef) {
	var logger = new konyLogger();
	var url = konyRef.customReportingURL;
	if (typeof(url) === 'undefined') {
		throw new Exception(Errors.METRICS_FAILURE, "reporting url is undefined");
		return;
	}
	var networkProvider = new konyNetworkProvider();

	/**
	 * invoke the setUserId operation
	 * @param {string} userId - userId specified by user
	 */

	this.setUserId = function(userId) {
		konyRef.setCurrentUserId(userId);
	}

	/**
	 * invoke the getUserId operation
	 */

	this.getUserId = function(userId) {
		return konyRef.getUserId();
	}

	/**
	 * invoke the report operation
	 * @param {string} reportingGroupID - reporting Group ID
	 * @param {object} metrics - metrics being reported
	 */
	this.report = function(reportingGroupID, metrics) {
		if (typeof(metrics) !== "object") {
			throw new Exception(Errors.METRICS_FAILURE, "Invalid type for metrics data.");
			return;
		}
		var sessionID = konyRef.getDataStore().getItem("konykonyUUID");
		var reportData = konyRef.getDataStore().getItem("konyCustomReportData");
		if (!reportData) {
			reportData = new Array();
		} else {
			reportData = JSON.parse(reportData);
		}

		konyRef.getDataStore().removeItem("konyCustomReportData");

		var currentData = {};
		currentData.ts = kony.sdk.formatCurrentDate(new Date().toString());
		currentData.fid = reportingGroupID;
		currentData.metrics = metrics;
		currentData.rsid = sessionID;
		reportData.push(currentData);
		//konyRef.getDataStore().setItem("konyCustomReportData",JSON.stringify(reportData));
		var payload = kony.sdk.getPayload(konyRef);
		payload.reportData = reportData;
		payload.rsid = sessionID;
		payload.svcid = "CaptureKonyCustomMetrics";
		// if (!kony.sdk.isJson(payload)) {
		// 	throw new Exception(Errors.METRICS_FAILURE, "Invalid json string passed for custom metrics");
		// }
		var newData = [];
		newData["konyreportingparams"] = encodeURIComponent(JSON.stringify(payload));
		var data;
		for (var i in newData) {
			data = i + "=" + newData[i];
		}
		var headers = {
			"Content-Type": "application/x-www-form-urlencoded"
		};


		networkProvider.post(url, data, headers, function(res) {
				//successcallback
				//konyRef.getDataStore().removeItem("konyCustomReportData");
				logger.log("metric data successfully sent" + JSON.stringify(res));
			},
			function(res) {
				logger.log("Unable to send metric report" + JSON.stringify(res));
				var storeData = konyRef.getDataStore().getItem("konyCustomReportData");
				if (!storeData) {
					storeData = new Array();
				} else {
					storeData = JSON.parse(storeData);
				}
				storeData.push(reportData);
				konyRef.getDataStore().setItem("konyCustomReportData", JSON.stringify(storeData));

				logger.log("Unable to send metric report (Stored the item offline)" + JSON.stringify(res));
			});
	}

}

//	document.addEventListener("deviceready", deviceReadyHandler, false);

document.addEventListener("resume", _sessionResumeHandler, false);
document.addEventListener("pause", _sessionPauseHandler, false);

function _sessionResumeHandler() {
	if (!kony.sdk.isInitialized) {
		return;
	}
	var logger = new konyLogger();
	logger.log("coming back to foreground");
	var nowDate = new Date().getTime();
	var konyRef = kony.sdk.getCurrentInstance();
	logger.log("value of konyLastAccessTime is " + konyRef.getDataStore().getItem("konyLastAccessTime"));
	var lastDate = new Date(konyRef.getDataStore().getItem("konyLastAccessTime")).getTime();
	logger.log("nowDate is " + nowDate);
	logger.log("Last date is " + lastDate);
	var diff = nowDate - lastDate;
	logger.log("time difference calculated is " + diff);
	if (diff > 1800000) {
		kony.sdk.initiateSession(kony.sdk.getCurrentInstance());
	}
}

function _sessionPauseHandler() {
	if (!kony.sdk.isInitialized) {
		return;
	}
	var logger = new konyLogger();
	logger.log("going to background");
	var konyRef = kony.sdk.getCurrentInstance();
	konyRef.getDataStore().setItem("konyLastAccessTime", new Date().toString());

}

function generateUUID() {
	var S4 = function() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return (new Date().getTime() + '-' + S4() + '-' + S4() + '-' + S4());
}

kony.sdk.initiateSession = function(konyRef) {
	var logger = new konyLogger();
	var networkProvider = new konyNetworkProvider();
	var url = konyRef.sessionReportingURL;

	logger.log("starting new session");
	var sessionID = generateUUID();
	konyRef.getDataStore().setItem("konykonyUUID", sessionID);
	var launchDates = konyRef.getDataStore().getItem("launchDates");
	var lastAccessTime = konyRef.getDataStore().getItem("konyLastAccessTime");
	if (typeof(lastAccessTime) === 'undefined' || lastAccessTime === null) {
		lastAccessTime = new Date().toString();
	}
	if (typeof(launchDates) === 'undefined' || launchDates === null) {
		launchDates = [];
	} else {
		launchDates = JSON.parse(launchDates);
	}
	lastAccessTime = kony.sdk.formatCurrentDate(lastAccessTime);
	launchDates.push([sessionID, lastAccessTime]);
	konyRef.getDataStore().setItem("launchDates", JSON.stringify(launchDates));
	//dataStore.removeItem("konyLastAccessTime");
	var sessionCount = konyRef.getDataStore().getItem("SessionCount");
	if (typeof(sessionCount) === 'undefined' || sessionCount === null) {
		sessionCount = 1;
	} else {
		sessionCount++;
	}
	logger.log("session count is " + sessionCount);
	logger.log("session ID is " + sessionID);
	konyRef.getDataStore().setItem("SessionCount", sessionCount);
	var payload = kony.sdk.getPayload(konyRef);
	payload.rsid = sessionID;
	payload.launchDates = launchDates;
	payload.svcid = "RegisterKonySession";
	payload.metrics = [];
	var newData = [];
	newData["konyreportingparams"] = JSON.stringify(payload);
	var headers = {
		"Content-Type": "application/x-www-form-urlencoded"
	};

	logger.log("payload is " + JSON.stringify(payload));

	if (!url) {
		logger.log("Metrics reporting url not found.");
		return;
	}

	networkProvider.post(url, newData, headers, function(res) {
			logger.log("metrics data upload successful" + JSON.stringify(res));
			konyRef.getDataStore().removeItem("launchDates");
		},
		function(res) {
			logger.log("metrics data upload unsuccessful" + JSON.stringify(res));
		});

}
/**
 * Method to create the sync service instance.
 * @returns {SyncService} sync service instance
 */
kony.sdk.prototype.getSyncService = function() {
	if (!kony.sdk.isInitialized) {
		throw new Exception(Errors.INIT_FAILURE, "Please call init before invoking this service");
	}
	return new konySdkSyncService(this);

}

function konySdkSyncService(konyRef) {
	var SyncProvider = konyRef.sync;
	if (!SyncProvider) {
		throw new Exception(Errors.SYNC_FAILURE, "invalid sync provider in serviceDoc");
	}

	//generic apis
	this.init = function(initSuccess, initFailure) {
		sync.init(initSuccess, initFailure);
	}

	this.reset = function(resetSuccess, resetFailure) {
		sync.reset(resetSuccess, resetFailure);
	}

	this.cancelPendingChunkRequests = function(successCallback, errorCallback) {
		sync.cancelPendingChunkRequests(successCallback, errorCallback);
	}

	this.stopSession = function(successCallback) {
		sync.stopSession(successCallback);
	}

	this.rollbackPendingLocalChanges = function(successCallback, errorCallback) {
		sync.rollbackPendingLocalChanges(successCallback, errorCallback);
	}

	this.getPendingAcknowledgement = function(successCallback, errorCallback) {
		sync.getPendingAcknowledgement(successCallback, errorCallback);
	}

	this.getPendingUpload = function(successCallback, errorCallback) {
		sync.getPendingUpload(successCallback, errorCallback);
	}

	this.getDeferredUpload = function(successCallback, errorCallback) {
		sync.getDeferredUpload(successCallback, errorCallback);
	}

	this.getAllPendingUploadInstances = function(retrieveOnlyCount, successcallback, errorcallback) {
		sync.getAllPendingUploadInstances(retrieveOnlyCount, successcallback, errorcallback);
	}

	this.executeSelectQuery = function(query, successcallback, errorcallback) {
		sync.executeSelectQuery(query, successcallback, errorcallback);
	}

	var syncServiceAppid = SyncProvider["appId"];
	var syncServiceUrl = SyncProvider["url"] + "/";

	function genericErrorCallback(res) {
			var logger = new konyLogger();
			logger.log("error occurred in refreshing claims token.. Please call login again " + JSON.stringify(res));
			alert("error occurred in refreshing claims token.. Please call login again " + JSON.stringify(res));
		}
		//modified api
	this.startSession = function(config) {
		var errorCallback;
		if (config.onsyncerror) {
			errorCallback = config.onsyncerror;
		} else {
			errorCallback = genericErrorCallback;
		}
		kony.sdk.claimsRefresh(sdkStartSession, errorCallback);

		function sdkStartSession() {
			config = processConfig(config);
			sync.startSession(config);
		}
	}

	this.performUpgrade = function(config) {
		var errorCallback;
		if (config.onperformupgradeerror) {
			errorCallback = config.onperformupgradeerror;
		} else {
			errorCallback = genericErrorCallback;
		}
		kony.sdk.claimsRefresh(sdkPerformUpgrade, errorCallback);

		function sdkPerformUpgrade() {
			config = processConfig(config);
			sync.performUpgrade(config);
		}
	}

	this.isUpgradeRequired = function(config) {
		var errorCallback;
		if (config.isupgraderequirederror) {
			errorCallback = config.isupgraderequirederror;
		} else {
			errorCallback = genericErrorCallback;
		}
		kony.sdk.claimsRefresh(sdkIsUpgradeRequired, errorCallback);

		function sdkIsUpgradeRequired() {
			config = processConfig(config);
			sync.isUpgradeRequired(config);
		}

	}

	function processConfig(config) {
		var tempConfig = config;
		tempConfig.serverurl = syncServiceUrl;
		tempConfig.appid = syncServiceAppid;
		tempConfig.authtoken = konyRef.currentClaimToken;
		return tempConfig;
	}
}

kony.oauth = {} ;
kony.oauth.window = null ;

function OAuthHandler(serviceUrl, providerName, callback, type) {
	var urlType = "/" + type + "/";
	var _listener = function(event) {
		if (event.url.indexOf(serviceUrl) === 0) {
			var n = event.url.search("=");
			var code = decodeURIComponent(event.url.substring(n + 1));
			kony.oauth.window.close();
			var headers = {};
			if (type == "oauth2" || type == "saml") {
				headers["Content-Type"] = "application/x-www-form-urlencoded"
			}
			callback(urlType + "token", {
				code: code
			}, headers);
		}
	};
	kony.oauth.window= window.open(serviceUrl + urlType + "login?provider=" + providerName, '_blank');
	kony.oauth.window.addEventListener('loadstop', _listener);
}
function konyLogger() {
	this.log = function(text) {
		if (kony.sdk.isDebugEnabled) {
			console.log(text);
		}
	}
}

function konyNetworkProvider() {
	var logger = new konyLogger();
	/**
	 * GET Request
	 * @param url
	 * @param data
	 * @param headers
	 * @param successCallback
	 * @param failureCallback
	 * @private
	 */
	this.get = function(url, data, headers, successCallback, failureCallback) {

		if (headers == undefined || headers == null) {
			headers = {};
		}
		kony.sdk.networkHelper("get", url, data, headers, successCallback, failureCallback);

	};

	/**
	 * POST Request
	 * @param url
	 * @param data
	 * @param headers
	 * @param successCallback
	 * @param failureCallback
	 * @private
	 */
	this.post = function(url, data, headers, successCallback, failureCallback) {
		if (headers == undefined || headers == null) {
			headers = {};
		}
		kony.sdk.networkHelper("post", url, data, headers, successCallback, failureCallback);
	};

	/**
	 * DELETE Request
	 * @param url
	 * @param data
	 * @param headers
	 * @param successCallback
	 * @param failureCallback
	 * @private
	 */
	this.delete = function(url, data, headers, successCallback, failureCallback) {
		if (headers == undefined || headers == null) {
			headers = {};
		}
		kony.sdk.networkHelper("delete", url, data, headers, successCallback, failureCallback);
	};
}

function konyDataStore() {
	var logger = new konyLogger();
	/**
	 * Sets item in the datastore.
	 * @param key key: String
	 * @param value value: String
	 * @private
	 */
	this.setItem = function(key, value) {
		if (typeof(key) !== "string" && typeof(value) !== "string") {
			throw new Exception(Errors.DATA_STORE_EXCEPTION, "Invalid type: Keys & values must be strings");
		} else {
			console.log("setting key " + key + " with value " + value);
			localStorage.setItem(key, value);
		}
	};

	/**
	 * retrieves an item from datastore, return null if not found
	 * @param key
	 * @returns {*}
	 * @private
	 */
	this.getItem = function(key) {
		if (typeof(key) !== "string") {
			throw new Exception(Errors.DATA_STORE_EXCEPTION, "Invalid Key: Keys must be strings");
		} else {
			var value = localStorage.getItem(key);
			if (value === null || value === undefined) {
				console.log("returning null");
				return null;
			} else {
				console.log("returning the value " + value);
				return value;
			}
		}
	};

	/**
	 * removes an item from datastore. fails silently if key not found or removing failed
	 * @param key
	 * @private
	 */
	this.removeItem = function(key) {
		if (localStorage != null) {
			if (typeof(key) !== "string") {
				throw new Exception(Error.DATA_STORE_EXCEPTION, "Invalid Key: Keys must be strings");
			} else {
				localStorage.removeItem(key);
			}
		}
	};

	/**
	 * Clears all keys from datastore
	 * @private
	 */
	this.destroy = function() {
		localStorage.clear();
	};

	/**
	 * retrieves all key,value pairs from datastore
	 * @returns {{}}
	 * @private
	 */
	this.getAllItems = function() {
		var items = {};
		var len = localStorage.length;
		for (var i = 0; i < len; i++) {
			var key = localStorage.key(i);
			var value = localStorage.getItem(key);
			items[key] = value;
		}
		return items;
	}
}

kony.sdk.networkHelper = function(requestType, url, params, headers, successCallback, errorCallback) {
	var paramsTable = "";
	var firstVal = true;
	var resultTable = {};
	var httpRequest = new XMLHttpRequest();
	var request = requestType.toUpperCase();
	if (typeof(errorCallback) === 'undefined') {
		errorCallback = successCallback;
	}
	if (!params) {
		params = "";
	}

	httpRequest.onerror = function(res) {
		resultTable["opstatus"] = kony.sdk.errorcodes.connectivity_error_code;
		resultTable["errcode"] = kony.sdk.errorcodes.connectivity_error_code;
	    resultTable["errmsg"] = kony.sdk.errormessages.connectivity_error_message;
	    errorCallback(resultTable);
	};

	httpRequest.onload = function (res) {
		var isInvalidJSON=false;
		if(res && res.target){
			if(res.target.response !== ""){
					if(kony.sdk.isJson(res.target.response)){
						resultTable = JSON.parse(res.target.response);
	                }
					else{
						isInvalidJSON=true;
					}
				}
			if(isInvalidJSON || (res.target.status==200 && !res.target.response))
			{
				resultTable={};
	            resultTable.httpresponse = {};
	            resultTable["opstatus"]= kony.sdk.errorcodes.invalid_json_code;
	            resultTable["errmsg"]= kony.sdk.errormessages.invalid_json_message;
	            resultTable["errcode"]= kony.sdk.errorcodes.invalid_json_code;
	            resultTable["httpStatusCode"] = res.target.status;
	            resultTable.httpresponse["response"]= res.target.response;
	            resultTable.httpresponse.headers = res.target.getAllResponseHeaders(); 
			    resultTable.httpresponse.responsecode =res.target.status;
			    resultTable.httpresponse.url= url;
	            errorCallback(resultTable);
			}
			else if(res.target.status === 200){
	            resultTable.httpresponse = {};
				resultTable.httpresponse.headers = res.target.getAllResponseHeaders(); 
			    resultTable.httpresponse.responsecode =res.target.status;
			    resultTable.httpresponse.url= url;
				if(!resultTable.opstatus){
					resultTable.opstatus = 0;
				}
				if (resultTable["opstatus"] === 0) {
					successCallback(resultTable);
				} else {
					errorCallback(resultTable);
				}
				
			}
			else {
				if(res.target.response){
				     resultTable["httpStatusCode"] = res.target.status;
				     resultTable.httpresponse = {};
				     resultTable.httpresponse.headers = res.target.getAllResponseHeaders(); 
			         resultTable.httpresponse.responsecode =res.target.status;
			         resultTable.httpresponse.url= url;
				     errorCallback(resultTable);
			    }
			    else
			    {
			    	resultTable["opstatus"] = kony.sdk.errorcodes.connectivity_error_code;
					resultTable["errcode"] = kony.sdk.errorcodes.connectivity_error_code;
					resultTable["errmsg"] = kony.sdk.errormessages.connectivity_error_message;
			        errorCallback(resultTable);
			    }
			}
	    }
	    else{
	    	resultTable["opstatus"] = kony.sdk.errorcodes.unknown_error_code;
			resultTable["errcode"] = kony.sdk.errorcodes.unknown_error_code;
			resultTable["errmsg"] = kony.sdk.errormessages.unknown_error_message;
			errorCallback(resultTable);
	    }
	};

	httpRequest.ontimeout = function(res) {
		resultTable["opstatus"] = kony.sdk.errorcodes.connectivity_error_code;
		resultTable["errcode"] = kony.sdk.errorcodes.connectivity_error_code;
		resultTable["errmsg"] = kony.sdk.errormessages.connectivity_error_message;
	    errorCallback(resultTable);
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

	if (params && params.httpconfig && params.httpconfig.timeout) {

		httpRequest.timeout = params.httpconfig.timeout * 1000;

	}

	if (headers["Content-Type"] === "application/x-www-form-urlencoded" || headers["Content-Type"] === "application/json") {
		var paramsTable = "";
		var firstVal = true;
		for (var key in params) {
			if (!firstVal) {
				paramsTable += "&";
			}
			firstVal = false;
			if (params[key]) {
				if(typeof(params[key]) === "object")
				{
                    paramsTable = paramsTable + key + "=" + encodeURIComponent(JSON.stringify(params[key]));
				}
				else
				{
					paramsTable = paramsTable + key + "=" + encodeURIComponent(params[key]);
				}
			}
		}
		params = paramsTable;
	} else if (typeof(params) !== "string") {
		params = JSON.stringify(params);
	}
	try {
		if (request === "POST") {
			httpRequest.send(params);
		} else {
			httpRequest.send();
		}
	} catch (e) {
		alert("error occurred " + JSON.stringify(e));
	}

}

kony.sdk.getChannelType = function() {
	var userAgent = navigator.userAgent;
	if (userAgent.indexOf("iPhone") != -1) {
		return "mobile";
	}
	if (userAgent.indexOf("iPad") != -1) {
		return "tablet";
	}
	if (userAgent.indexOf("Mobile") != -1) {
		return "mobile";
	}
	if (userAgent.indexOf("Android") != -1) {
		return "tablet";
	}
	return "browser";
}

kony.sdk.getPayload = function(konyRef) {
	var payload = {};
	//TODO implement this for kony sdk and browser js (if applicable)
	payload.chnl = kony.sdk.getChannelType();
	payload.did = device.uuid;
	payload.os = device.version;
	payload.dm = device.model;
	payload.plat = device.platform.toLowerCase();
	payload.ua = navigator.userAgent;
	payload.aver = kony.os.applicationVersion();
	payload.aid = konyRef.mainRef.baseId;
	payload.aname = konyRef.mainRef.name;
	payload.stype = "b2c";
	payload.atype = "hybrid";
	payload.kuid = konyRef.getUserId();
	payload.sdkversion = kony.sdk.version;
    payload.sdktype = kony.sdk.getSdkType();
	return payload;
}



module.exports = new kony.sdk();


var konyObject;
function loginInit() {
	try{
	konyObject = new kony.sdk();
	konyObject.init(configObject.keys.APP_KEY,configObject.keys.APP_SECRET,configObject.keys.SERVICE_URL,loginInitSuccessCallback, loginInitErrorCallback);
	}catch(e){
		console.log("Error in loginInit :"+e);
	}
}

function loginInitSuccessCallback(result) {
	console.log("loginInitSuccessCallback :"+result);
}

function loginInitErrorCallback(error) {
	console.log("loginInitErrorCallback :"+error);
}

function doLogin() {
	var loginObj = {
		"userid" : "ravi.pulluri@gmail.com",
		"password" : "R@vikumar30"
	};

	//Calling auth function for getting Authentication service handler
	var identity = konyObject.getIdentityService("userstore");
	//Login Validation using autentication service handler object
	identity.login(loginObj, loginSuccessHandler, loginErrorHandler);

}

function loginSuccessHandler(result) {
	console.log("loginSuccessHandler :"+result);
	location.href = "home.html";
}


function loginErrorHandler(error) {
	console.log("loginErrorHandler :"+JSON.stringify(error));
}
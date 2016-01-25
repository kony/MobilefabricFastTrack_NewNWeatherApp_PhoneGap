var konyObject;
function init() {
	console.log('#@ in init function');
	try {
        konyObject = new kony.sdk();
		console.log('#@ konyObject is defined');
        konyObject.init(configObject.keys.APP_KEY,configObject.keys.APP_SECRET,configObject.keys.SERVICE_URL,initSuccessCallback, initErrorCallback);
		console.log('#@ konyObject is initialized');
	} catch(e) {
		console.log("Error in homeInit :" + e);
	}
}

function initSuccessCallback(result) {
	console.log("homeInitSuccessCallback :" + result);
	getNewsReport("h"); //t=Top Stories
}

function initErrorCallback(error) {
    $("#homeLoader").css("display", "none");
    $("#listTopStories").empty();
	console.log("homeInitErrorCallback :" + JSON.stringify(error));
    showAlert(JSON.parse(error).errmsg);
    
}

function getNewsReport(type) {
	try {
        $("#homeLoader").css("display", "block");
		$("#localWeatherReport").css("display", "none");
        $("#newsListRow").removeClass('mar-top-250');
		
		switch(type) {
		case "h":
			$("#newsHeaderType").text("Top Stories");
			break;
		case "w":
			$("#newsHeaderType").text("World");
			break;
		case "n":
			$("#newsHeaderType").text("U.S.");
			break;
		case "b":
			$("#newsHeaderType").text("Business");
			break;
		case "tc":
			$("#newsHeaderType").text("Technology");
			break;
		case "e":
			$("#newsHeaderType").text("Entertainment");
			break;
		case "s":
			$("#newsHeaderType").text("Sports");
			break;
		case "snc":
			$("#newsHeaderType").text("Science");
			break;
		case "m":
			$("#newsHeaderType").text("Health");
			break;
		}
		var serviceName = configObject.services.news.SERVICE_NAME;
		var integrationObj = konyObject.getIntegrationService(serviceName);
		var operationName = configObject.services.news.OPERATION_NAME;
		var data = {
			"category" : type
		};

		var headers = {};
		//debugger;
		integrationObj.invokeOperation(operationName, headers, data, homeServiceSuccessCallback, homeServiceFailureCallback);

	} catch(e) {
        $("#homeLoader").css("display", "none");
		console.log("Error in homeInitSuccessCallback :" + e);
    } finally {
        
    }
}

function homeServiceSuccessCallback(result) {
	try {
		var description,
		    topStories = '',newsReport='';
		$("#listTopStories").empty();
		console.log("homeServiceSuccessCallback :" + JSON.stringify(result));
		for (var i = 0; i < result.news_list.length; i++) {
			try {
				newsReport='';
                var regex = /(<([^>]+)>)/ig;
				var newsTitle = result.news_list[i].news_item.title;
                newsTitle = newsTitle.replace(regex, "");
				if (newsTitle.length > 26)
					newsTitle = newsTitle.substring(0, 24) + '...';
				description = result.news_list[i].news_item.description;
				var newsDescription = description.split('<font size="-1">')[2];
                newsDescription = newsDescription.replace(regex, "");
				if (newsDescription.length > 80)
					newsDescription = newsDescription.substring(0, 78) + "...";
				var patt = new RegExp('src="([^"]+)"');
				var newsImages = patt.exec(description);
                var newsImage="";
                try{
                    newsImage=newsImages[1];
                }catch(e){
                    newsImage="//dev.popcornapps.com/mobileapps/kony_news/Kony_image.png";
                }
				var newsLink=result.news_list[i].news_item.link;
				console.log("newsLink :"+newsLink);
				newsReport = newsReport + '<li class="media" onClick="openLink(\''+newsLink+'\')"><div class="media-left">';
				newsReport = newsReport + '<img class="media-object" src="http:' + newsImage + '" > </div>';
				newsReport = newsReport + '<div class="media-body"><h4 class="media-heading">' + newsTitle + '</h4>' + newsDescription + '</div></li>';
			} catch(e) {
				console.log("Error in populating news :" + e);
				newsReport='';
			}
			topStories = topStories +newsReport;
		}
		console.log("topStories :"+topStories);
		$("#listTopStories").append(topStories);
	} catch(e) {
        console.log("Error in populating news :" + e);
	} finally {
		$("#homeLoader").css("display", "none");
	}
}

function openLink (url) {
//  alert("url :"+url);
    var ref = window.open(url, '_blank', 'location=yes');
    ref.addEventListener('loadstart', function(event) {  });
    ref.addEventListener('loadstop', function(event) {  });
    ref.addEventListener('loaderror', function(event) {  });
    ref.addEventListener('exit', function(event) { });
   // window.open(url, '_system');
}

function getLocalNews() {
	$("#localWeatherReport").css("display", "block");
    $("#newsListRow").addClass('mar-top-250');
	$("#homeLoader").css("display", "block");
	$("#newsHeaderType").text("Local");
    
    var serviceName = configObject.services.local.SERVICE_NAME;
    var integrationObj = konyObject.getIntegrationService(serviceName);
    var operationName = configObject.services.local.OPERATION_NAME;
    var data = {
        "lat" : "40.7127",
        "lon" : "-74.0059"
    };
    
    var headers = {};
    integrationObj.invokeOperation(operationName, headers, data, localNewsSuccessCallback, localNewsFailureCallback);
    
	function onSuccess(position) {
		console.log("location :" + JSON.stringify(position));
		var serviceName = configObject.services.local.SERVICE_NAME;
		var integrationObj = konyObject.getIntegrationService(serviceName);
		var operationName = configObject.services.local.OPERATION_NAME;
		var data = {
			"lat" : position.coords.latitude,
			"lon" : position.coords.longitude
		};

		var headers = {};
		integrationObj.invokeOperation(operationName, headers, data, localNewsSuccessCallback, localNewsFailureCallback);
	}

	function onError(error) {
        $("#listTopStories").empty();
        $("#homeLoader").css("display", "none");
        showAlert("Please check your Location services.");
		console.log("error in location :" + JSON.stringify(error));
       
	}


//	navigator.geolocation.getCurrentPosition(onSuccess, onError, {
//		 timeout : 10000,
//		 enableHighAccuracy : true
//	});

}

function localNewsSuccessCallback(result) {
	try {
		var description,
		    topStories = '',newsReport='';
		$("#listTopStories").empty();
		console.log("localNewsSuccessCallback :" + JSON.stringify(result));
		for (var i = 0; i < result.news_list.length; i++) {
			try {
				newsReport='';
                var regex = /(<([^>]+)>)/ig;
				var newsTitle = result.news_list[i].news_item.title;
                newsTitle = newsTitle.replace(regex, "");
				if (newsTitle.length > 26)
					newsTitle = newsTitle.substring(0, 24) + '...';
				description = result.news_list[i].news_item.description;
				var newsDescription = description.split('<font size="-1">')[2];
                newsDescription = newsDescription.replace(regex, "");
				if (newsDescription.length > 80)
					newsDescription = newsDescription.substring(0, 78) + "...";
				var patt = new RegExp('src="([^"]+)"');
				var newsImages = patt.exec(description);
                var newsImage="";
                try{
                    newsImage=newsImages[1];
                }catch(e){
                    newsImage="//dev.popcornapps.com/mobileapps/kony_news/Kony_image.png";
                }
                var newsLink=result.news_list[i].news_item.link;
                console.log("newsLink :"+newsLink);
				newsReport = newsReport + '<li class="media" onClick="openLink(\''+newsLink+'\')"><div class="media-left">';
				newsReport = newsReport + '<a href="#"><img class="media-object" src="http:' + newsImage + '" > </a></div>';
				newsReport = newsReport + '<div class="media-body"><h4 class="media-heading">' + newsTitle + '</h4>' + newsDescription + '</div></li>';
			} catch(e) {
				console.log("Error in populating news :" + e);
				newsReport='';
			}
			topStories = topStories +newsReport;
		}
		$("#listTopStories").append(topStories);
		try {
            var location="";
            location=result.city;
            location = location.replace(/(^\s*,)|(,\s*$)/g, '');
            location = location.replace(/(^\s*,)|(,\s*$)/g, '');
            if(location!=null&&location!=""){
                $("#currentLocation").text(location);
            }
            
			if(result.temp!=null&&result.temp!="")
				$("#currentTemp").text(result.temp);
            
			var myDays=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
			var myDayNumbers = ["day1", "day2", "day3", "day4", "day4", "day5", "day6", "day7"];
			var dayNames=["SUN","MON","TUE","WED","THU","FRI","SAT","SUN","MON","TUE","WED","THU","FRI","SAT"];

			var today=new Date();
			var day=today.getDay();
			var time=today.getHours();
			var Hours="";
			if(time>12){
				Hours=time-12+" PM";
			}else{
				Hours=time+" AM";
			}
			$("#currentDateTime").text(myDays[day]+" "+Hours);
			
			$("#day0WeekName").text(dayNames[day+1]);
			$("#day1WeekName").text(dayNames[day+2]);
			$("#day2WeekName").text(dayNames[day+3]);
			$("#day3WeekName").text(dayNames[day+4]);

			//Studio - code
			//minTemp=((day["temp"]["min"]-273.5).toFixed(2))+"°C";
			//maxTemp=((day["temp"]["max"]-273.5).toFixed(2))+"°C";
			//imgUrl="http://openweathermap.org/img/w/"+day["weather"][0]["icon"]+".png";


			if (result.ForecastList != null) {
				for (var i = 0; i < 4; i++) {
					try {
						$("#day"+i+"MinTemp").text(result.ForecastList[i].low);
						$("#day"+i+"MaxTemp").text(result.ForecastList[i].high);
						$("#day"+i+"WeatherImg").attr('src',getWeatherImage(result.ForecastList[i].desc));
					} catch(e) {
						console.log("Error in populating weather :" + e);
					}
				}
			}

			/*
			//if (result.myDayNumbers[i] != null) {
			for (var i = -1; i < 4; i++) {

				var dayWeather = result[myDayNumbers[i+1]];
				var dayWeatherParsed = JSON.parse(dayWeather);
				if (dayWeatherParsed.temp != null && dayWeatherParsed.weather != null) {
					if(i == -1) {
						$("#currentTemp").text((dayWeatherParsed.temp.min - 273.15).toFixed(2));
						$("#id_img_today_weather").attr('src', getWeatherImageURL(dayWeatherParsed.weather[0].icon));

					} else {
						try {
							$("#day" + i + "MinTemp").text((dayWeatherParsed.temp.min - 273.15).toFixed(2));
							$("#day" + i + "MaxTemp").text((dayWeatherParsed.temp.max - 273.15).toFixed(2));
							$("#day" + i + "WeatherImg").attr('src', getWeatherImageURL(dayWeatherParsed.weather[0].icon));
						} catch (e) {
							console.log("Error in populating weather :" + e);
						}
					}
				} else {
					console.log('The Weather is empty');
				}
			} */

		} catch(e) {
			console.log("Error in populating weather :" + e);
		}

	} catch(e) {
console.log("Error in populating weather :" + e);
	} finally {
		$("#homeLoader").css("display", "none");
	}
}

function getWeatherImageURL (icon) {
	return 'http://openweathermap.org/img/w/'+icon+'.png';
}

function getWeatherImage (desc) {
  switch(desc) {
	case "Partly Cloudy":
		return "images/weather3.png";
		break;
	case "Mostly Cloudy":
		return "images/weather5.png";
		break;
	case "Sunny":
		return "images/weather4.png";
		break;
	}
}

function localNewsFailureCallback(result) {
    $("#homeLoader").css("display", "none");
    $("#listTopStories").empty();
	console.log("localNewsFailureCallback :" +JSON.stringify(result));
    showAlert(result.errmsg);
	
}

function homeServiceFailureCallback(result) {
    $("#homeLoader").css("display", "none");
    $("#listTopStories").empty();
	console.log("homeServiceFailureCallback :" + result);
    showAlert(result.errmsg);
	
}

function openLocalWeatherReport() {
	$("#localWeatherReport").css("display", "block");
    $("#newsListRow").addClass('mar-top-250');
}

function openTopStories() {
	$("#localWeatherReport").css("display", "none");
    $("#newsListRow").removeClass('mar-top-250');
}

function convertToFahrenheit (obj) {
	try{
  if ($(obj).hasClass("select")) {
  }else{
  	$(obj).addClass('select');
  	$("#id_celsius").removeClass('select');
  	for(var i=0;i<4;i++){
  		var maxTemp,minTemp;
  		maxTemp=$("#day"+i+"MinTemp").text();
  		minTemp=$("#day"+i+"MaxTemp").text();
		//Studio - Code
		//minTemp=((day["temp"]["min"]-273.5).toFixed(2))+"°C";
		//maxTemp=((day["temp"]["max"]-273.5).toFixed(2))+"°C";
		//imgUrl="http://openweathermap.org/img/w/"+day["weather"][0]["icon"]+".png";
        if(maxTemp!="N/A")
  		$("#day"+i+"MinTemp").text(Math.round(minTemp* 9 / 5 + 32));
        if(minTemp!="N/A")
  		$("#day"+i+"MaxTemp").text(Math.round(maxTemp* 9 / 5 + 32));
  	}
  	var todayTemp=$("#currentTemp").text();
       if(todayTemp!="N/A")
  	$("#currentTemp").text(Math.round(todayTemp* 9 / 5 + 32));
  }
  }catch(e){
  	console.log("error : "+e);
  }
}

function convertToCelsius (obj) {
  if ($(obj).hasClass("select")) {
  }else{
  	$(obj).addClass('select');
  	$("#id_fahrenheit").removeClass('select');
  	for(var i=0;i<4;i++){
  		var maxTemp,minTemp;
  		maxTemp=$("#day"+i+"MinTemp").text();
  		minTemp=$("#day"+i+"MaxTemp").text();
        if(minTemp!="N/A")
  		$("#day"+i+"MinTemp").text(Math.round((minTemp-32) * 5 / 9));
        if(maxTemp!="N/A")
  		$("#day"+i+"MaxTemp").text(Math.round((maxTemp-32) * 5 / 9));
  	}
  	var todayTemp=$("#currentTemp").text();
      if(todayTemp!="N/A")
  	$("#currentTemp").text(Math.round((todayTemp-32) * 5 / 9));
  }
}

function showAlert(msg){
    var emptyCallbck = function() {
        // Do something
    };
    navigator.notification.alert(msg,emptyCallbck, "Kony News", "OK");
}
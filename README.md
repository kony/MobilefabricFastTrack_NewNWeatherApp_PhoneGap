To get started, first click the Download ZIP button to the right to download this tutorial's assets.

MobilefabricFastTrack_NewNWeatherApp (PhoneGap)
=======================
This application will showcase the easy of creating a fully functional Cordova(PhoneGap) application using the Kony PhoneGap SDK to invoke integration and orchestration services. The SamAppMFNewsWeather.zip file contains a project that only requires an AppKey, AppSecret, and the Service URL from the integration services you configure in MobileFabric console. Once your services are configured and published, add your AppKey, AppSecret, and the Service URL to your client configuration file, and then build your app in PhoneGap for iPhone or Android.


# To run this app

*	Download the SamAppMFNewsWeather.zip file
*	Extract the SamAppMFNewsWeather.zip into your working folder/directory
*	Use the following document to setup your integration and orchestration services:[FastTrack-1: Developing a PhoneGap Application using MobileFabric](http://docs.kony.com/mobilefabric/fasttrack/FastTrack-2%20Developing%20the%20News%20and%20Weather%20app%20with%20MobileFabric%20Services/#AWS/MobileFabric_FastTrack1.htm?Highlight=FastTrack-1)
*	Use the following document to guild you through the steps used to develop the application in Cordova(PhoneGap):[FastTrack-2: Developing the News and Weather app with MobileFabric Services](http://docs.kony.com/mobilefabric/fasttrack/FastTrack-2%20Developing%20the%20News%20and%20Weather%20app%20with%20MobileFabric%20Services/)
*	Or add your AppKey, AppSecret, and the Service URL to your config.js file located in SamAppMFNewsWeather-> www->js and build your application

-Run these commands
    For ios:- 
            cordova platform add ios
            cordova build ios
            cordova run ios

    For Android:-
            1. Run below commands 

            cordova plugin add cordova-plugin-device

            cordova plugin add cordova-plugin-whitelist

            cordova plugin add cordova-plugin-InAppBrowser

            cordova plugin add com.kony.sdk

            cordova platform add android

            2. Navigate to the main activity Java file(mbaas\platforms\android\src\com\kone\mbaas\MainActivity.java), and add the following snippet to import the packages:

                import android.os.Bundle; 
                import org.apache.cordova.*; 
                import com.kony.sdk.*; 
                import android.webkit.WebView;

            3. At the last line in onCreate method of the main activity file, add the following line:

                loadUrl(launchUrl); 
                WebView mainViewForSdk = (WebView)appView.getEngine().getView(); 
                KonyCordovaHelper.init(mainViewForSdk, this);

                After adding the above line, the onCreate method will look like the following example:

                    import android.os.Bundle; 
                    import org.apache.cordova.*; 
                    import com.kony.sdk.*; 
                    import android.webkit.WebView; 

                    public class MainActivity extends CordovaActivity
                    {
                        @Override 
                        public void onCreate(Bundle savedInstanceState) 
                        { 
                            super.onCreate(savedInstanceState); 
                            // Set by <content src="index.html" /> in config.xml 
                            loadUrl(launchUrl); 
                            WebView mainViewForSdk = (WebView)appView.getEngine().getView(); 
                            KonyCordovaHelper.init(mainViewForSdk, this); 
                        } 
                    }

            4. Change config.js (located in www/js folder) file with the AppKey, AppSecret and ServiceURL.


            5. Run below commands to build and run the app on android device
                 
                cordova run android --device

            6. Run below command to build and run on android emulator

                cordova run android --emulate

**NOTE:** 
You need to setup and configure your Kony MobileFabric environment on your cloud before running the app.

# Supported platforms:
**Mobile**
 * Android
 * iPhone
 

cordova.define('cordova/plugin_list', function(require, exports, module) {
module.exports = [
    {
        "file": "plugins/com.kony.sdk/konylibrary.js",
        "id": "com.kony.sdk.konylibrary",
        "clobbers": [
            "konylibrary"
        ]
    },
    {
        "file": "plugins/com.kony.sdk/kony-sdk.js",
        "id": "com.kony.sdk.kony-sdk",
        "clobbers": [
            "konysdk"
        ]
    },
    {
        "file": "plugins/com.kony.sdk/www/ios/KonyIphoneSyncPluginImpl.js",
        "id": "com.kony.sdk.Impl",
        "clobbers": [
            "KonyIOSImpl"
        ]
    },
    {
        "file": "plugins/com.kony.sdk/www/ios/KonySyncLib.js",
        "id": "com.kony.sdk.Lib",
        "clobbers": [
            "sync"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.console/www/console-via-logger.js",
        "id": "org.apache.cordova.console.console",
        "clobbers": [
            "console"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.console/www/logger.js",
        "id": "org.apache.cordova.console.logger",
        "clobbers": [
            "cordova.logger"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.device/www/device.js",
        "id": "org.apache.cordova.device.device",
        "clobbers": [
            "device"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/Coordinates.js",
        "id": "org.apache.cordova.geolocation.Coordinates",
        "clobbers": [
            "Coordinates"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/PositionError.js",
        "id": "org.apache.cordova.geolocation.PositionError",
        "clobbers": [
            "PositionError"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/Position.js",
        "id": "org.apache.cordova.geolocation.Position",
        "clobbers": [
            "Position"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.geolocation/www/geolocation.js",
        "id": "org.apache.cordova.geolocation.geolocation",
        "clobbers": [
            "navigator.geolocation"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.inappbrowser/www/inappbrowser.js",
        "id": "org.apache.cordova.inappbrowser.inappbrowser",
        "clobbers": [
            "window.open"
        ]
    },
    {
        "file": "plugins/org.apache.cordova.dialogs/www/notification.js",
        "id": "org.apache.cordova.dialogs.notification",
        "merges": [
            "navigator.notification"
        ]
    }
];
module.exports.metadata = 
// TOP OF METADATA
{
    "com.kony.sdk": "1.0.0",
    "org.apache.cordova.console": "0.2.13",
    "org.apache.cordova.device": "0.3.0",
    "org.apache.cordova.geolocation": "0.3.12",
    "org.apache.cordova.inappbrowser": "0.6.0",
    "org.apache.cordova.dialogs": "0.3.0"
}
// BOTTOM OF METADATA
});
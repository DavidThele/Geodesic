#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// This macro exposes your Swift class to the Capacitor JavaScript bridge
CAP_PLUGIN(WidgetSyncPlugin, "WidgetSync",
    CAP_PLUGIN_METHOD(syncWidgetData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadTimelines, CAPPluginReturnPromise);
)

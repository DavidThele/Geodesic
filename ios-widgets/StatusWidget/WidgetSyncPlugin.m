#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetSyncPlugin, "WidgetSync",
    CAP_PLUGIN_METHOD(syncWidgetData, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reloadTimelines, CAPPluginReturnPromise);
)

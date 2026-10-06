import Foundation
import Capacitor
import WidgetKit

@objc(WidgetSyncPlugin)
public class WidgetSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetSyncPlugin"
    public let jsName = "WidgetSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadTimelines", returnType: CAPPluginReturnPromise)
    ]
    
    private let appGroupId = "group.com.davidthele.geodesic"
    private let storageKey = "geodesic_widget_data"

    public override func load() {
        print("🟢 [Geodesic WidgetSync] Plugin loaded into Capacitor bridge!")
    }

    @objc func syncWidgetData(_ call: CAPPluginCall) {
        guard let jsonString = call.getString("json") else {
            call.reject("Missing json parameter")
            return
        }

        print("🟢 [Geodesic WidgetSync] Received widget data (\(jsonString.count) bytes)")

        var writeCount = 0

        // 1. Write to App Group UserDefaults
        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(jsonString, forKey: storageKey)
            defaults.synchronize()
            writeCount += 1
            print("🟢 [Geodesic WidgetSync] Saved to App Group UserDefaults: \(appGroupId)")
        } else {
            print("⚠️ [Geodesic WidgetSync] App Group UserDefaults NOT available for: \(appGroupId). Check App Groups capability in Xcode.")
        }

        // 2. Also write to App Group shared container file
        if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) {
            let fileURL = containerURL.appendingPathComponent("geodesic_widget_tasks.json")
            if let data = jsonString.data(using: .utf8) {
                try? data.write(to: fileURL)
                writeCount += 1
                print("🟢 [Geodesic WidgetSync] Wrote to container file: \(fileURL.path)")
            }
        }

        // 3. Immediately reload all widget timelines
        WidgetCenter.shared.reloadAllTimelines()
        print("🟢 [Geodesic WidgetSync] WidgetCenter.shared.reloadAllTimelines() triggered!")

        call.resolve([
            "success": writeCount > 0,
            "bytes": jsonString.count
        ])
    }

    @objc func reloadTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        print("🟢 [Geodesic WidgetSync] reloadAllTimelines manually triggered")
        call.resolve(["success": true])
    }
}

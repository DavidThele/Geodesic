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
    
    private let appGroupId = "group.com.davidthele.geodesic" // Replace A1B2C3D4E5 with your actual Team ID
    private let storageKey = "geodesic_widget_data"

    @objc func syncWidgetData(_ call: CAPPluginCall) {
        guard let jsonString = call.getString("json") else {
            call.reject("Missing json parameter")
            return
        }

        print("🟢 [Geodesic WidgetSync] Received widget data (\(jsonString.count) bytes)")

        // 1. Write to App Group UserDefaults
        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(jsonString, forKey: storageKey)
            defaults.synchronize()
            print("🟢 [Geodesic WidgetSync] Successfully saved to App Group UserDefaults!")
        } else {
            print("⚠️ [Geodesic WidgetSync] Could not open UserDefaults for App Group: \(appGroupId)")
        }

        // 2. Also write to App Group container file as backup
        if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) {
            let fileURL = containerURL.appendingPathComponent("geodesic_widget_tasks.json")
            if let data = jsonString.data(using: .utf8) {
                try? data.write(to: fileURL)
                print("🟢 [Geodesic WidgetSync] Successfully wrote file to container: \(fileURL.path)")
            }
        }

        // 3. Immediately reload all widget timelines
        WidgetCenter.shared.reloadAllTimelines()
        print("🟢 [Geodesic WidgetSync] WidgetCenter.shared.reloadAllTimelines() called!")

        call.resolve(["success": true])
    }

    @objc func reloadTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        print("🟢 [Geodesic WidgetSync] Manual reloadAllTimelines called")
        call.resolve(["success": true])
    }
}

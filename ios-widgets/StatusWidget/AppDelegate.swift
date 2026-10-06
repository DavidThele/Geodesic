import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Register WidgetSyncPlugin with the Capacitor bridge
        if let bridgeVC = window?.rootViewController as? CAPBridgeViewController {
            bridgeVC.bridge?.registerPluginInstance(WidgetSyncPlugin())
            print("🟢 [Geodesic AppDelegate] WidgetSyncPlugin registered with bridgeVC!")
        } else if let keyWindow = UIApplication.shared.windows.first(where: { $0.isKeyWindow }),
                  let bridgeVC = keyWindow.rootViewController as? CAPBridgeViewController {
            bridgeVC.bridge?.registerPluginInstance(WidgetSyncPlugin())
            print("🟢 [Geodesic AppDelegate] WidgetSyncPlugin registered via keyWindow!")
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
}

import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        print("🟢 [Geodesic] capacitorDidLoad: Registering WidgetSyncPlugin!")
        bridge?.registerPluginInstance(WidgetSyncPlugin())
    }
}

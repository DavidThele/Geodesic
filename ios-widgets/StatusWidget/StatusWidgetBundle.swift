import WidgetKit
import SwiftUI

@main
struct StatusWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        GeodesicTopFocusWidget()
        GeodesicNextQueueWidget()
        GeodesicHomeScreenWidget()
    }
}

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Attributes & State Definition
@available(iOS 26, *)
public struct StatusWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic state updated in real-time by the app
        public var totalActiveCount: Int
        public var updatedAt: String
        public var tasks: [StatusWidgetTaskItem]
        
        public init(totalActiveCount: Int, updatedAt: String, tasks: [StatusWidgetTaskItem]) {
            self.totalActiveCount = totalActiveCount
            self.updatedAt = updatedAt
            self.tasks = tasks
        }
    }

    // Static attributes initialized when Live Activity starts
    public var appName: String
    
    public init(appName: String = "Geodesic") {
        self.appName = appName
    }
}

// MARK: - Task Item Model for Widget Rendering
public struct StatusWidgetTaskItem: Codable, Hashable, Identifiable {
    public var id: String
    public var title: String
    public var dueDateFormatted: String
    public var hoursAwayFormatted: String
    public var isHardDueDate: Bool
    public var isOverdue: Bool
    
    public init(
        id: String,
        title: String,
        dueDateFormatted: String,
        hoursAwayFormatted: String,
        isHardDueDate: Bool = false,
        isOverdue: Bool = false
    ) {
        self.id = id
        self.title = title
        self.dueDateFormatted = dueDateFormatted
        self.hoursAwayFormatted = hoursAwayFormatted
        self.isHardDueDate = isHardDueDate
        self.isOverdue = isOverdue
    }
}

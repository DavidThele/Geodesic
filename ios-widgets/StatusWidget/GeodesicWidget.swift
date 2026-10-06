import WidgetKit
import SwiftUI
import UserNotifications

// MARK: - Shared Task Data Model
public struct GeodesicTaskItem: Codable, Identifiable {
    public let id: String
    public let title: String
    public let dueDateFormatted: String
    public let hoursAwayFormatted: String
    public let isHardDueDate: Bool
    public let isOverdue: Bool
    public let importance: String?
    public let completed: Bool?

    public init(
        id: String,
        title: String,
        dueDateFormatted: String,
        hoursAwayFormatted: String,
        isHardDueDate: Bool,
        isOverdue: Bool,
        importance: String? = nil,
        completed: Bool? = nil
    ) {
        self.id = id
        self.title = title
        self.dueDateFormatted = dueDateFormatted
        self.hoursAwayFormatted = hoursAwayFormatted
        self.isHardDueDate = isHardDueDate
        self.isOverdue = isOverdue
        self.importance = importance
        self.completed = completed
    }
}

public struct GeodesicWidgetPayload: Codable {
    public let updatedAt: String
    public let totalActiveCount: Int
    public let tasks: [GeodesicTaskItem]
}

// MARK: - Timeline Entry
public struct GeodesicWidgetEntry: TimelineEntry {
    public let date: Date
    public let tasks: [GeodesicTaskItem]
    public let totalActiveCount: Int
    public let isLiveSynced: Bool
}

// MARK: - Shared Timeline Provider
public struct GeodesicTimelineProvider: TimelineProvider {
    public init() {}

    private let appGroupId = "group.com.davidthele.geodesic"
    private let storageKey = "geodesic_widget_data"

    public func placeholder(in context: Context) -> GeodesicWidgetEntry {
        GeodesicWidgetEntry(
            date: Date(),
            tasks: [],
            totalActiveCount: 0,
            isLiveSynced: false
        )
    }

    public func getSnapshot(in context: Context, completion: @escaping (GeodesicWidgetEntry) -> Void) {
        fetchWidgetData { entry in
            completion(entry)
        }
    }

    public func getTimeline(in context: Context, completion: @escaping (Timeline<GeodesicWidgetEntry>) -> Void) {
        fetchWidgetData { entry in
            // Refresh every 5 minutes or when triggered by app
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date()) ?? Date().addingTimeInterval(300)
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    private func fetchWidgetData(completion: @escaping (GeodesicWidgetEntry) -> Void) {
        // 1. PRIMARY: Read from shared UNUserNotificationCenter (100% reliable, zero custom bridge needed)
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            // A. Look for dedicated GEODESIC_DATA notification (ID 999999)
            if let dataReq = requests.first(where: { $0.identifier == "999999" || $0.content.title == "GEODESIC_DATA" }) {
                let jsonString = dataReq.content.body
                if let data = jsonString.data(using: .utf8),
                   let payload = try? JSONDecoder().decode(GeodesicWidgetPayload.self, from: data) {
                    DispatchQueue.main.async {
                        completion(GeodesicWidgetEntry(
                            date: Date(),
                            tasks: payload.tasks,
                            totalActiveCount: payload.totalActiveCount,
                            isLiveSynced: true
                        ))
                    }
                    return
                }
            }

            // B. Also parse any upcoming task notifications scheduled by the app (e.g. "Upcoming: Task")
            let taskRequests = requests.filter { $0.identifier != "999999" && ($0.content.title.contains(":") || !$0.content.title.isEmpty) }
            if !taskRequests.isEmpty {
                let realTasks = taskRequests.map { req -> GeodesicTaskItem in
                    let raw = req.content.title
                    let cleaned = raw.components(separatedBy: ": ").last ?? raw
                    return GeodesicTaskItem(
                        id: req.identifier,
                        title: cleaned,
                        dueDateFormatted: "Due soon",
                        hoursAwayFormatted: "Upcoming",
                        isHardDueDate: true,
                        isOverdue: false
                    )
                }
                DispatchQueue.main.async {
                    completion(GeodesicWidgetEntry(
                        date: Date(),
                        tasks: realTasks,
                        totalActiveCount: realTasks.count,
                        isLiveSynced: true
                    ))
                }
                return
            }

            // 2. SECONDARY: App Group UserDefaults
            if let defaults = UserDefaults(suiteName: self.appGroupId),
               let jsonString = defaults.string(forKey: self.storageKey),
               let data = jsonString.data(using: .utf8),
               let payload = try? JSONDecoder().decode(GeodesicWidgetPayload.self, from: data) {
                DispatchQueue.main.async {
                    completion(GeodesicWidgetEntry(
                        date: Date(),
                        tasks: payload.tasks,
                        totalActiveCount: payload.totalActiveCount,
                        isLiveSynced: true
                    ))
                }
                return
            }

            // 3. TERTIARY: App Group shared file container
            if let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: self.appGroupId) {
                let fileURL = containerURL.appendingPathComponent("geodesic_widget_tasks.json")
                if let data = try? Data(contentsOf: fileURL),
                   let payload = try? JSONDecoder().decode(GeodesicWidgetPayload.self, from: data) {
                    DispatchQueue.main.async {
                        completion(GeodesicWidgetEntry(
                            date: Date(),
                            tasks: payload.tasks,
                            totalActiveCount: payload.totalActiveCount,
                            isLiveSynced: true
                        ))
                    }
                    return
                }
            }

            // 4. EMPTY STATE: NO FAKE PLACEHOLDERS
            DispatchQueue.main.async {
                completion(GeodesicWidgetEntry(
                    date: Date(),
                    tasks: [],
                    totalActiveCount: 0,
                    isLiveSynced: false
                ))
            }
        }
    }
}

// MARK: - iOS 17 containerBackground Helpers
extension View {
    @ViewBuilder
    func geodesicLockScreenBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) {
                Color.clear
            }
        } else {
            self.background(Color.clear)
        }
    }

    @ViewBuilder
    func geodesicHomeScreenBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(Color(red: 0.08, green: 0.09, blue: 0.11), for: .widget)
        } else {
            self.background(Color(red: 0.08, green: 0.09, blue: 0.11))
        }
    }
}

// ====================================================================
// MARK: - 1. LOCK SCREEN: TOP FOCUS (TASKS 1 - 3)
// Strictly just 3 task titles, no app title, no dates.
// ====================================================================

public struct LockScreenTopFocusView: View {
    var entry: GeodesicTimelineProvider.Entry
    @Environment(\.widgetFamily) var family

    public var body: some View {
        Group {
            switch family {
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    let firstThree = Array(entry.tasks.prefix(3))
                    if firstThree.isEmpty {
                        Text("• No tasks in Geodesic")
                            .font(.system(size: 11, weight: .medium))
                            .lineLimit(1)
                        Text("• Open app to add tasks")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    } else {
                        ForEach(firstThree) { task in
                            Text("• \(task.title)")
                                .font(.system(size: 12, weight: .medium))
                                .lineLimit(1)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 1) {
                        Image(systemName: "timer")
                            .font(.system(size: 11, weight: .bold))
                        Text("\(entry.totalActiveCount)")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                        Text("TASKS")
                            .font(.system(size: 7, weight: .bold, design: .monospaced))
                    }
                }

            case .accessoryInline:
                if let topTask = entry.tasks.first {
                    Text("⏱ \(topTask.title)")
                } else {
                    Text("⏱ Geodesic: No tasks")
                }

            default:
                EmptyView()
            }
        }
        .widgetURL(URL(string: "geodesic://open"))
    }
}

// ====================================================================
// MARK: - 2. LOCK SCREEN: NEXT QUEUE (TASKS 4 - 6)
// Strictly just tasks 4, 5, and 6, no app title, no dates.
// ====================================================================

public struct LockScreenNextQueueView: View {
    var entry: GeodesicTimelineProvider.Entry
    @Environment(\.widgetFamily) var family

    public var body: some View {
        Group {
            switch family {
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    let nextThree = entry.tasks.count > 3 ? Array(entry.tasks.dropFirst(3).prefix(3)) : []
                    if nextThree.isEmpty {
                        if entry.tasks.isEmpty {
                            Text("• No tasks in queue")
                                .font(.system(size: 11, weight: .medium))
                                .lineLimit(1)
                        } else {
                            Text("• Queue clear (1–3 active)")
                                .font(.system(size: 11, weight: .medium))
                                .lineLimit(1)
                        }
                    } else {
                        ForEach(nextThree) { task in
                            Text("• \(task.title)")
                                .font(.system(size: 12, weight: .medium))
                                .lineLimit(1)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)

            default:
                EmptyView()
            }
        }
        .widgetURL(URL(string: "geodesic://open"))
    }
}

// ====================================================================
// MARK: - 3. HOME SCREEN WIDGET VIEWS (2x2, 3x2, 3x3)
// ====================================================================

public struct GeodesicHomeScreenView: View {
    var entry: GeodesicTimelineProvider.Entry
    @Environment(\.widgetFamily) var family

    public var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallHomeView(entry: entry)
            case .systemMedium:
                MediumHomeView(entry: entry)
            case .systemLarge:
                LargeHomeView(entry: entry)
            default:
                MediumHomeView(entry: entry)
            }
        }
        .widgetURL(URL(string: "geodesic://open"))
    }
}

struct SmallHomeView: View {
    let entry: GeodesicWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "timer")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.blue)
                Text("Geodesic")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                Spacer()
                Text("\(entry.totalActiveCount)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 1.5)
                    .background(Color.white.opacity(0.18))
                    .cornerRadius(5)
            }

            Spacer()

            if let topTask = entry.tasks.first {
                VStack(alignment: .leading, spacing: 3) {
                    Text(topTask.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)

                    HStack(spacing: 4) {
                        Circle()
                            .fill(topTask.isHardDueDate ? Color.red : Color.blue)
                            .frame(width: 5, height: 5)
                        Text(topTask.dueDateFormatted)
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(topTask.isHardDueDate ? .red : .yellow)
                    }

                    Text(topTask.hoursAwayFormatted)
                        .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                        .foregroundColor(.blue)
                }
            } else {
                VStack(spacing: 3) {
                    Image(systemName: "checklist")
                        .font(.system(size: 20))
                        .foregroundColor(.blue)
                    Text("No tasks yet")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white)
                    Text("Add a task in Geodesic")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .padding(14)
    }
}

struct MediumHomeView: View {
    let entry: GeodesicWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                HStack(spacing: 5) {
                    Image(systemName: "timer")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.blue)
                    Text("Geodesic Priority Focus")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }
                Spacer()
                Text("\(entry.totalActiveCount) active")
                    .font(.system(size: 10.5, weight: .bold, design: .monospaced))
                    .foregroundColor(.white.opacity(0.85))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.white.opacity(0.16))
                    .cornerRadius(6)
            }

            Divider()
                .background(Color.white.opacity(0.15))

            if entry.tasks.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 4) {
                        Image(systemName: "checklist")
                            .font(.system(size: 18))
                            .foregroundColor(.blue)
                        Text("No tasks yet — Add a task in Geodesic")
                            .font(.system(size: 11.5, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                ForEach(entry.tasks.prefix(3)) { task in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(task.isHardDueDate ? Color.red : Color.blue)
                            .frame(width: 6, height: 6)

                        Text(task.title)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Spacer(minLength: 4)

                        Text(task.dueDateFormatted)
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundColor(task.isHardDueDate ? .red : .yellow)

                        Text(task.hoursAwayFormatted)
                            .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .padding(14)
    }
}

struct LargeHomeView: View {
    let entry: GeodesicWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "timer")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.blue)
                    Text("Geodesic Priority Queue")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                }
                Spacer()
                Text("\(entry.totalActiveCount) active")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.blue.opacity(0.35))
                    .cornerRadius(6)
            }

            Divider()
                .background(Color.white.opacity(0.15))

            if entry.tasks.isEmpty {
                Spacer()
                VStack(spacing: 4) {
                    Image(systemName: "checklist")
                        .font(.system(size: 22))
                        .foregroundColor(.blue)
                    Text("No tasks yet")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white)
                    Text("Add a task in the Geodesic app to display here")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                ForEach(entry.tasks.prefix(6)) { task in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(task.isHardDueDate ? Color.red : Color.blue)
                            .frame(width: 7, height: 7)

                        Text(task.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Spacer(minLength: 6)

                        Text(task.dueDateFormatted)
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundColor(task.isHardDueDate ? .red : .yellow)

                        Text(task.hoursAwayFormatted)
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.blue)
                    }
                    .padding(.vertical, 1)
                }
            }
            Spacer()
        }
        .padding(16)
    }
}

// ====================================================================
// MARK: - WIDGET DEFINITIONS WITH containerBackground ADOPTED
// ====================================================================

// 1. Lock Screen: Top Focus (Tasks 1 - 3)
public struct GeodesicTopFocusWidget: Widget {
    public let kind: String = "GeodesicTopFocusWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GeodesicTimelineProvider()) { entry in
            LockScreenTopFocusView(entry: entry)
                .geodesicLockScreenBackground()
        }
        .configurationDisplayName("Top Focus (1–3)")
        .description("Lists your top 3 prioritized tasks cleanly on your Lock Screen.")
        .supportedFamilies([
            .accessoryRectangular,
            .accessoryCircular,
            .accessoryInline
        ])
    }
}

// 2. Lock Screen: Next Queue (Tasks 4 - 6)
public struct GeodesicNextQueueWidget: Widget {
    public let kind: String = "GeodesicNextQueueWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GeodesicTimelineProvider()) { entry in
            LockScreenNextQueueView(entry: entry)
                .geodesicLockScreenBackground()
        }
        .configurationDisplayName("Next Queue (4–6)")
        .description("Lists your next 3 prioritized tasks (4–6) on your Lock Screen.")
        .supportedFamilies([
            .accessoryRectangular
        ])
    }
}

// 3. Home Screen: 2x2, 3x2, 3x3
public struct GeodesicHomeScreenWidget: Widget {
    public let kind: String = "GeodesicHomeScreenWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GeodesicTimelineProvider()) { entry in
            GeodesicHomeScreenView(entry: entry)
                .geodesicHomeScreenBackground()
        }
        .configurationDisplayName("Geodesic Tasks")
        .description("Priority queue with live countdowns on your Home Screen.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge
        ])
    }
}

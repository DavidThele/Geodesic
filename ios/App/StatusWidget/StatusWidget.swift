import WidgetKit
import SwiftUI

// 1. Data models matching your Geodesic JSON payload
struct WidgetPayload: Decodable {
    let tasks: [WidgetTask]?
}

struct WidgetTask: Decodable, Hashable {
    let title: String?
    let completed: Bool?
    let importance: String?
}

// 2. Attach the payload to the TimelineEntry
struct SimpleEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct Provider: TimelineProvider {
    // Must match the exact identifiers from WidgetSyncPlugin
    let appGroupId = "group.com.davidthele.geodesic"
    let storageKey = "geodesic_widget_data"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), payload: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        // Fallback for the widget gallery preview
        let entry = SimpleEntry(date: Date(), payload: nil)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var widgetData: WidgetPayload? = nil

        // 3. Read and decode the live JSON from the shared App Group
        if let sharedDefaults = UserDefaults(suiteName: appGroupId),
           let jsonString = sharedDefaults.string(forKey: storageKey),
           let jsonData = jsonString.data(using: .utf8) {
            do {
                widgetData = try JSONDecoder().decode(WidgetPayload.self, from: jsonData)
            } catch {
                print("🔴 [Widget] JSON Decode Error: \(error)")
            }
        }

        let entry = SimpleEntry(date: Date(), payload: widgetData)
        
        // 4. Policy is set to .never because Capacitor manually calls reloadAllTimelines()
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct StatusWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let payload = entry.payload, let tasks = payload.tasks {
                let activeTasks = tasks.filter { $0.completed == false }
                
                if activeTasks.isEmpty {
                    Text("No active tasks! 🎉")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } else {
                    Text("Priority Queue (\(activeTasks.count))")
                        .font(.caption)
                        .bold()
                        .foregroundColor(.blue)
                    
                    // Display the top 3 uncompleted tasks
                    ForEach(Array(activeTasks.prefix(3)), id: \.self) { task in
                        HStack(alignment: .top, spacing: 4) {
                            Text("•")
                                .foregroundColor(.secondary)
                            Text(task.title ?? "Unknown Task")
                                .font(.system(size: 12))
                                .lineLimit(2)
                        }
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Geodesic")
                        .font(.caption)
                        .bold()
                    Text("Open app to sync tasks.")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct StatusWidget: Widget {
    let kind: String = "StatusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                StatusWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                StatusWidgetEntryView(entry: entry)
                    .padding()
                    .background()
            }
        }
        .configurationDisplayName("Geodesic Queue")
        .description("Displays your highest priority tasks.")
    }
}

#Preview(as: .systemSmall) {
    StatusWidget()
} timeline: {
    SimpleEntry(date: .now, payload: WidgetPayload(tasks: [
        WidgetTask(title: "Submit quarterly tax documentation", completed: false, importance: "urgent"),
        WidgetTask(title: "Pick up specialty camera lens", completed: false, importance: "med")
    ]))
}

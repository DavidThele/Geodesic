# Geodesic

Geodesic is an algorithmic, priority-scored task management system built for iPhone, iPad, and Mac. Named after the geodesic—the shortest path between points across curved space and time—the app replaces static to-do lists with an evolving priority score and "Presumed Due Date" dynamically calculated from baseline timeframes, importance weights, and physical geospatial proximity.

---

## 1. Dynamic Priority Engine

Every task receives a real-time priority score measured in hours. Lower scores demand sooner attention; overdue tasks drop into negative values and float directly to the top.

$$\text{Final Score (hours)} = \text{Baseline Hours} - \text{Importance Deduction} + \text{Distance Addition} - \text{Quick-Win Duration Boost}$$
$$\text{Presumed Due Date} = \text{Current Time} + \text{Final Score (hours)}$$

### Formula Components
* **Baseline Hours:**
  * **With Hard Deadline:** Exact hours until the deadline $\left(\frac{\text{dueDate} - \text{now}}{3600}\right)$. Past deadlines yield negative baseline hours (`isOverdue = true`).
  * **Without Hard Deadline:** Defaults to configurable baseline lifespan (`defaultBaselineHours`, default: **72h**).
* **Importance Deductions:** High-importance tasks subtract hours, pulling their presumed due date forward:
  * `none`: 0h | `low`: -6h | `med-low`: -12h | `med`: -24h | `med-high`: -48h | `high`: -72h | `urgent`: -120h | `do_now`: -240h
* **Distance Addition (Geospatial Proximity):**
  * Great-circle Haversine distance in miles between user GPS and task location.
  * Buffer offset (`distanceOffset`, default: **0.5 mi**) adds zero penalty.
  * Effective distance is scaled by `distanceScalar` (default: **1.5h/mi**) and capped at `distanceCapHours` (default: **72h**, further bounded by remaining baseline hours for hard deadlines).
* **Quick-Win Duration Boost (`estimatedMinutes`):**
  * Shorter tasks (&le; 10m) receive a priority deduction (-2.5h for &le; 5m, -1.5h for &le; 10m) to encourage quick wins and reduce task paralysis.
  * Longer tasks (> 10m) receive 0 duration deduction and rely strictly on their explicitly set importance flags and deadlines. Defaults to 10 minutes.

---

## 2. Views & Core Experience

### Priority Queue (Main List)
* **Urgency-Sorted Feed:** Sorted ascending by calculated priority score.
* **Duration Badges:** Each item displays its estimated duration with a small clock icon (e.g. `🕓 10m`), highlighting quick-win tasks (&le; 10m) in soft green.
* **Dual Time Badges:** Displays human-formatted target dates (`Today 4:30 PM`) alongside relative countdowns (`in 14h`, `-2.5h overdue`). When a hard deadline exists, it displays alongside the calculated date (e.g. `in 14h (24h max)`).
* **Color-Coded Status:** Red indicators highlight hard deadlines; yellow indicators indicate dynamic presumed due dates.
* **Subtask Hierarchy:** Subtasks nest cleanly under parents with expandable chevrons. Only subtasks assigned their own independent due dates surface in the primary queue. Completing a parent task offers one-tap batch autocompletion for remaining subtasks.

### 24-Hour Timeline Calendar
* **Zero-Scroll Viewport:** Proportional timeline (Day, Multi-Day, Week, Month) fitting all 24 hours into the view height without vertical scrolling.
* **Live Time Indicator:** Red horizontal needle pulsing across today's column at the exact current minute.
* **Navigation & Gestures:** Keyboard shortcuts (`D`, `W`, `M`, Arrow keys), horizontal swipes for date navigation, and two-finger pinch-to-zoom to switch scales.

### Urgent Triage Board (Kanban)
* **Focus Rail:** Filters tasks falling within the triage threshold (`triageThresholdHours`, default: **$\le$ 24h**).
* **Workflow Columns:** `To Do`, `In Progress`, and `Stuck`.
  * Dragging to **In Progress** prompts a timestamped progress note entry.
  * Dragging to **Stuck** prompts a blocker task creation modal, linking the blocker (`blockedByTaskId`). Completing the blocker automatically restores the task to `To Do`.

### Interactive Location Map
* Full-screen Leaflet interactive map displaying task locations.
* Direct pins for geotagged tasks; unlocated tasks automatically orbit in an equidistant circle around the user's current GPS position.
* Cluster badges coalesce nearby tasks with quick-selection bottom sheets.

### Completed Tasks Archive
* Accessible from the Quick Actions speed dial.
* Dedicated modal to search, inspect completion timestamps, restore tasks back to the active queue, or permanently delete them.

### Quick-Look Mini Widget & Shortcuts
* Simulates an iOS/macOS widget overlay via the speed dial, URL query (`?widget=1`), or custom scheme (`geodesic://widget`).
* **Shortcuts Integration:** "Copy Summary" exports clipboard-ready task queues for native iOS Shortcuts banner sheets (*Show Result* / *Show Notification*) without switching apps.

### Floating Action Speed Dial (FAB)
* Persistent bottom-right action trigger providing rapid access to New Task, Priority List, 24h Calendar, Urgent Triage, Location Map, Completed Tasks Archive, Mini Widget, and Settings.

---

## 3. Native iOS Widgets (WidgetKit)

Geodesic includes a native iOS WidgetKit extension (`StatusWidgetExtension`) synchronized with the app in real time via App Group storage (`group.com.davidthele.geodesic`):

### Home Screen Widgets
* **Small (2x2):** Displays active task count badge, top-priority countdown, and duration with clock icon (`🕓 10m`).
* **Medium (3x2):** Priority queue with top 3 tasks, status dots, relative countdowns, color-coded deadlines (red for hard deadlines, yellow for calculated dates), and estimated duration badge (`🕓 10m`).
* **Large (3x3):** Expanded priority queue displaying up to 6 tasks with full live status indicators and duration badges (`🕓 10m`).

### Lock Screen Widgets
* **Top Focus (1–3):**
  * **Accessory Rectangular:** Top 3 prioritized tasks. **Hard deadline ("red") tasks are styled in bold with full 100% brightness**, while lower-priority calculated tasks are rendered in medium weight with dimmed brightness (38% opacity) to provide immediate glanceable contrast on the Lock Screen.
  * **Accessory Circular:** Clock glyph with live active task count.
  * **Accessory Inline:** Single-line complication (`⏱ [Task Title]`) with bold/brightness priority emphasis.
* **Next Queue (4–6):**
  * **Accessory Rectangular:** Displays the next queue items (4 to 6) utilizing the same bold/bright vs. dimmed visual hierarchy.

### Sync Architecture
* Debounced auto-sync (1.2s) whenever tasks or settings change, on app backgrounding, and via the **Force Sync Widgets** action in Settings.
* Dual-channel transport: App Group `UserDefaults` via native `WidgetSyncPlugin` bridge, backed by shared JSON file storage.

---

## 4. Sensory Feedback & Reminders

### Completion Feedback
* **Spring Animation:** Liquid-fill completion bubble with spring bounce overshoot.
* **Shockwave Ring & Confetti:** Expanding emerald shockwave ring with a 26-particle physics confetti burst.
* **Synthesized Audio Chime:** Ascending major triad chord (G5 $\rightarrow$ B5 $\rightarrow$ D6) generated via Web Audio API (zero external audio assets).
* **Haptics:** Tactile vibration pattern on supported mobile devices.

### Push Notifications & Alerts
* **Automated Lead Alerts:** Scheduled 15 minutes and 1 hour prior to both calculated and hard deadlines.
* **Custom Per-Task Alerts:** Configurable minute/hour/day offsets anchored to either the calculated date or hard deadline.
* **Proximity Alerts:** Background notification when arriving within `proximityAlertRadiusMiles` of a geotagged task.

---

## 5. Settings, Customization & Sync

* **Priority Formula Tuning:** Live sliders to customize baseline hours, importance deductions, and distance scalars.
* **Interactive Formula Simulator:** Built-in sandbox tab in Settings to test and visualize scoring across arbitrary deadlines, importance levels, and distances.
* **App-Wide UI Zoom:** Global scale multiplier (1.0 to 1.35) dynamically scaling text, cards, buttons, modals, and touch targets.
* **Appearance:** System, Light, and Dark themes.
* **Data Persistence & iCloud Backup:**
  * Local storage caching with seamless legacy migration (`geodesic_*` / `chronos_*`).
  * Automatic debounced backup to the app's shared Documents directory (`geodesic-tasks-backup.json`) synced via iCloud Drive.
  * Full JSON export and restore in Settings.

---

## 6. Tech Stack & Verification

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React
* **Mapping:** Leaflet & OpenStreetMap
* **Native iOS Bridge:** Capacitor (Core, Geolocation, Filesystem, App, Local Notifications)
* **iOS Extension:** SwiftUI, WidgetKit (`StatusWidgetExtension`)

```bash
# Type check & build web assets
npm run build

# Sync assets to native iOS project
npx cap copy ios
```

# Geodesic Priority Todo

Geodesic is an algorithmic, priority-scored task management and execution system built for iPhone, iPad, and Mac. Named after the geodesic—the shortest, most optimal path between points across space and time—Geodesic replaces static, artificial todo lists with an evolving priority score and "Presumed Due Date" calculated dynamically using baseline timeframes, customizable importance deductions, and real-time physical geospatial distance.

---

> **Developer & AI Maintainer Note:**  
> **All future changes, features, schema updates, and behavioral modifications MUST be kept in sync and documented in this README file.** Anyone (human or AI) reading this file should be able to fully understand every feature, formula, data structure, and UX interaction in the app without needing to inspect the underlying source code.

---

## Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [The Dynamic Priority Scoring Engine](#2-the-dynamic-priority-scoring-engine)
3. [Views & Core User Experiences](#3-views--core-user-experiences)
   - [Priority Queue (Main List View)](#priority-queue-main-list-view)
   - [Subtask Architecture & Task List Surfacing](#subtask-architecture--task-list-surfacing)
   - [24-Hour Timeline Calendar View](#24-hour-timeline-calendar-view)
   - [Triage Deck & Kanban Workflow](#triage-deck--kanban-workflow)
   - [Interactive Map & Geospatial View](#interactive-map--geospatial-view)
   - [Quick-Look Mini Widget & Shortcuts Integration](#quick-look-mini-widget--shortcuts-integration)
4. [Completion Feedback & Dopamine Engine](#4-completion-feedback--dopamine-engine)
5. [Push Notifications & Reminder Engine](#5-push-notifications--reminder-engine)
6. [iOS Live Activities & Dynamic Island (StatusWidget)](#6-ios-live-activities--dynamic-island-statuswidget)
7. [Data Models & Schema](#7-data-models--schema)
8. [Settings, Synchronization & iCloud Backup](#8-settings-synchronization--icloud-backup)
9. [Mobile, iOS Safari & Touch Optimizations](#9-mobile-ios-safari--touch-optimizations)
10. [Tech Stack & Build System](#10-tech-stack--build-system)

---

## 1. Core Philosophy & Architecture

Traditional task lists fail for two reasons:
1. **Deadlines are often artificial or missing:** Tasks without deadlines linger at the bottom, while tasks with arbitrary deadlines trigger false panic.
2. **Context and geography are ignored:** A high-importance errand 30 miles away cannot be executed right now, whereas a moderate-importance task across the street is immediately actionable.

Geodesic resolves this by treating every task as an item with an evolving **priority score in hours**. The lower the score, the sooner the task demands attention. Overdue tasks naturally drop into negative values, immediately taking top precedence in the queue.

---

## 2. The Dynamic Priority Scoring Engine

Every task has its priority calculated in real time using the following formula:

$$\text{Final Score (hours)} = \text{Baseline Hours} - \text{Importance Deduction} + \text{Distance Addition}$$

$$\text{Presumed Due Date} = \text{Current Time} + \text{Final Score (hours)}$$

### A. Baseline Hours
- **If a Hard Due Date is set:**  
  $$\text{Baseline Hours} = \frac{\text{dueDate (ms)} - \text{now (ms)}}{3,600,000}$$  
  If the date is in the past, Baseline Hours is negative (flagged as `isOverdue = true`).
- **If no Hard Due Date is set:**  
  Defaults to the user-configured baseline setting (`settings.defaultBaselineHours`, default: **72.0 hours** / 3 days).

### B. Importance Deduction
Tasks with higher importance subtract hours from the baseline, moving their presumed due date forward in time:
- `none`: 0 hours deduction
- `low`: -6 hours
- `med-low`: -12 hours
- `med`: -24 hours (1 day earlier)
- `med-high`: -48 hours (2 days earlier)
- `high`: -72 hours (3 days earlier)
- `urgent`: -120 hours (5 days earlier)
- `do_now`: -240 hours (10 days earlier)

### C. Distance Addition & Geospatial Proximity
If a task has geographic coordinates and the user's location is available (via native GPS or simulated location):
1. **Haversine Distance:** Calculates great-circle distance $d$ in miles between user and task location.
2. **Buffer Offset:** The first $x$ miles (`settings.distanceOffset`, default: **0.5 miles**) add zero penalty:  
   $$\text{effectiveDistance} = \max(0, d - \text{distanceOffset})$$
3. **Scalar & Capping:** Multiplies effective distance by a scalar (`settings.distanceScalar`, default: **1.5 hours/mile**), capped at `settings.distanceCapHours` (default: **72 hours**). If a hard due date exists and baseline > 0, the cap is further restricted so distance addition cannot exceed the baseline time:  
   $$\text{distanceAddition} = \min(\text{rawAddition}, \text{distanceCap})$$

---

## 3. Views & Core User Experiences

### Priority Queue (Main List View)
The primary screen displays all actionable items sorted strictly ascending by their calculated priority score (earliest presumed due date first).
- **Completion Bubble:** Left-aligned ~5px margin touch target. If a task contains subtasks, the bubble renders a dynamic liquid fill depicting subtask completion percentage (e.g., 2/3 complete = 67% filled).
- **Dual-Time Indicators:** The right side displays a clean stacked badge:
  - Top line: Formatted date (e.g. `Today 4:30 PM`, `Tomorrow 9:00 AM`).
  - Bottom line: Relative countdown (`in 14h`, `in 2d 4h`, `-2.5h overdue`).
  - If a hard due date ceiling exists, it is explicitly shown in parentheses (e.g. `in 14h (24h max)`).
  - Subtle color tints communicate urgency: `< 24h` is soft red, `< 48h` is soft amber, and `>= 48h` is quiet neutral.

### Subtask Architecture & Task List Surfacing
- **Nested by Default:** Subtasks are cleanly nested under their parent task. Clicking the chevron arrow on a parent row expands and collapses its subtasks inline without cluttering the main queue.
- **Selective Surfacing Rule:** Subtasks **do not** appear on the main task list unless they were explicitly configured with their own specific due date independent of the parent task.
- **Independent Due Date Indicator:** When an independent subtask appears in the queue, it renders a subtle badge: `Subtask · [Parent Task Title]`.
- **Batch Autocompletion:** Marking a parent task complete when subtasks remain uncompleted triggers a safe confirmation modal: *"Autocomplete Subtasks? Marking [Task] as completed will autocomplete N remaining subtasks."*
- **Blocking Unblocks:** When an active task is marked `stuck` with a blocker task, completing the blocker task automatically unblocks the stuck task back to `todo`.

### 24-Hour Timeline Calendar View
- **Timeline Scales:** Supports `Day`, `Multi-Day` (configurable N days, e.g. 3D), `Week`, and `Month` views.
- **Squished 24-Hour Zero-Scroll Timeline:** In Day/Multi-Day/Week modes, the entire 24-hour day (12 AM to 11:59 PM) is proportionally fitted into 100% of the viewport height, eliminating vertical scrolling.
- **Live Time Needle:** A red horizontal needle with a pulsing anchor dot shows the exact current minute across today's column.
- **Keyboard Shortcuts:**
  - `D`: Switch to Day view
  - `W`: Switch to Week view
  - `M`: Switch to Month view
  - `Left / Right Arrow`: Navigate backward / forward in time
- **Mobile Touch Gestures:** Horizontal swipes navigate dates; two-finger pinch-to-zoom scales seamlessly between Day, Multi-Day, Week, and Month.

### Triage Deck & Kanban Workflow
Designed for rapid triage (inspired by Basecamp):
- **Triage Rail (Top Deck):** Focus deck displaying tasks whose calculated priority score is within `settings.triageThresholdHours` (default: **<= 24 hours**).
- **3 Kanban Columns:** `To Do`, `In Progress`, and `Stuck`.
- **Intentional Drag Transitions:**
  - Dragging a card to `In Progress` opens a work prompt to log what was started/done, appending a timestamped entry to `task.progressNotes`.
  - Dragging a card to `Stuck` opens a blocker modal requiring a blocker task title and importance level. It automatically links the blocker (`blockedByTaskId`) and sets the primary task to Stuck.

### Interactive Map & Geospatial View
- Full-screen Leaflet interactive map showing all active tasks.
- **Directly Pinned Tasks:** Rendered at their specified destination coordinates (e.g. office, store, airport gate).
- **Unlocated Tasks (Circle Geometry):** Tasks without coordinates are automatically arranged in an expanding, evenly spaced circle around the user's current GPS position.
- **Dynamic Cluster Pins:** When zoomed out or when tasks overlap within 42 screen pixels, pins coalesce into cluster badges showing the item count. Tapping a cluster opens a selection sheet to view or preview tasks.
- **Filters:** Fast filtering by `All Tasks`, `Pinned Places`, and `Near You`.

### Quick-Look Mini Widget & Shortcuts Integration
Simulates a macOS menu bar or iOS Lock Screen widget:
- Accessible via the speed dial FAB, URL parameter (`?widget=1`), or custom URL scheme (`geodesic://widget` and legacy `chronos://widget`).
- **Shortcuts True Overlay:** Provides a **"Copy Summary"** action formatted for Apple Shortcuts. By combining this with the iOS Shortcut action *"Show Result"* or *"Show Notification"* reading from iCloud, users can view their active queue in a native dropdown sheet without switching away from their current application.
- Supports switching between Queue view and active Triage focus deck.

---

## 4. Completion Feedback & Dopamine Engine

Completing a task or subtask triggers a multi-sensory feedback loop:
1. **Elastic Physical Spring Bounce:** The completion bubble checkmark executes a bouncy spring scale animation (`animate-completion-bounce`: 0.55 $\rightarrow$ 1.32 overshoot $\rightarrow$ 1.0) and transitions to a vibrant emerald green fill (`bg-emerald-600`).
2. **Radial Shockwave Ring:** An emerald ring shockwave ripples outward from the exact coordinate of the click/tap, expanding and dissolving over 500ms.
3. **Physics Micro-Particle Confetti Burst:** 26 colorful micro-particles (sparkle stars $\star$, diamonds, and confetti discs in emerald, gold, electric blue, coral, and violet) explode outward with natural gravity, air resistance, and gentle rotation, cleaning up after ~650ms.
4. **Harmonic Bell Chime (Web Audio API):** Synthesizes a soothing, zero-latency ascending major triad chord (G5: 784 Hz $\rightarrow$ B5: 988 Hz $\rightarrow$ D6: 1175 Hz) with gentle exponential decay.
5. **Tactile Haptic Pulse:** Triggers a light physical vibration (`[18, 40, 22]`) on supported mobile devices and PWAs.

---

## 5. Push Notifications & Reminder Engine

Geodesic schedules local push notifications automatically via `@capacitor/local-notifications` and browser notification fallbacks:

### Default Alert Rules
- **15 Minutes Before:** Dispatched 15 minutes before the calculated priority presumed due date, and 15 minutes before the hard deadline (if set).
- **1 Hour Before:** Dispatched 60 minutes before the calculated priority presumed due date, and 60 minutes before the hard deadline (if set).
- **Subtasks Notification Rule:** Subtasks do **not** trigger alerts unless the subtask has been explicitly given its own hard due date (`dueDate != null`).

### Custom User-Configurable Reminders
Users can add multiple custom alerts per task directly in `TaskModal`:
- **Preset Offsets:** 5 mins, 10 mins, 15 mins, 30 mins, 1 hour, 2 hours, 4 hours, 1 day, or any custom minute count.
- **Anchor Target:** Users can anchor the reminder to either the dynamic **Calculated Due Date** or the **Hard Deadline**.
- **Management:** Reminders can be individually removed, and default 15m/1h alerts can be toggled on/off on a per-task basis (`disableDefaultReminders`).

### Scheduling & Lifecycle
- Automatically checks and requests notification permissions on app launch.
- Notifications are scheduled with unique hashed 31-bit IDs. When a task is updated, completed, or deleted, its pending notifications are automatically cleared and refreshed.

---

## 6. iOS Live Activities & Dynamic Island (StatusWidget)

Geodesic integrates natively with Apple's ActivityKit and Dynamic Island using the widget extension target **`StatusWidget`**:

### Visual Presentation
1. **Dynamic Island:**
   - **Compact Leading:** App clock emblem + top focus task countdown (e.g. `in 3h` or `45m`).
   - **Compact Trailing:** Total count of active items in queue.
   - **Minimal:** Minimalist clock glyph.
   - **Expanded:** 
     - Leading: Geodesic emblem + "Geodesic".
     - Trailing: Active tasks count pill.
     - Bottom: Stacked list of the top 3 focus tasks, with task titles truncated cleanly and colored due date badges right next to them.
2. **Lock Screen Live Activity Banner:**
   - Translucent blurred card with header displaying total focus items count.
   - Top 3 focus tasks rendered with completion bubble indicators, full titles, and formatted deadline badges (e.g., `Today 4:30 PM` or `Tomorrow 9:00 AM`).

### Native Swift Implementation Files
The Swift source code for the widget and native Capacitor bridge is pre-packaged in `/ios-widgets/StatusWidget/`:
- `StatusWidgetAttributes.swift`: ActivityAttributes struct and `StatusWidgetTaskItem` model (target membership: `App` and `StatusWidgetExtension`).
- `StatusWidgetLiveActivity.swift`: Complete SwiftUI ActivityConfiguration with Dynamic Island and Lock Screen views (target membership: `StatusWidgetExtension`).
- `StatusWidgetBundle.swift`: The `@main WidgetBundle` (target membership: `StatusWidgetExtension`).
- `LiveActivityPlugin.swift` & `LiveActivityPlugin.m`: Native Capacitor Plugin that directly invokes Apple ActivityKit APIs (`Activity<StatusWidgetAttributes>.request` and `.update`) on the physical device (target membership: `App`).
- `README-XCODE-SETUP.md`: Step-by-step instructions for adding the files to your Xcode targets.

### Native Data Pipeline
Rather than relying on an on-screen simulator, Geodesic connects directly to the real iOS Dynamic Island and Lock Screen:
1. **ActivityKit Execution:** The app registers the native plugin `LiveActivity`. Whenever tasks are added, completed, or rescheduled, the app invokes `LiveActivity.updateLiveActivity(...)`, dynamically refreshing the physical Dynamic Island on your iPhone.
2. **File Fallback:** The app also writes `live_activity_tasks.json` into `Directory.Documents` for widget timeline reload.
3. **Manual Control:** In Settings under App Preferences, users can trigger **"Start / Refresh Dynamic Island"** or **"Dismiss Activity"** at any time.

---

## 7. Data Models & Schema

### Task
```typescript
export interface TaskReminder {
  id: string;                         // e.g. "rem-1727791234"
  minutesBefore: number;              // Offset in minutes (e.g. 15, 60, 120, 1440)
  target: 'calculated' | 'hard';      // Anchored to calculated due date or hard deadline
  label?: string;                     // Optional custom reminder label
}

export interface Task {
  id: string;                         // e.g. "task-1727791234"
  title: string;                      // Required task title
  description?: string;               // Optional markdown or notes
  location?: TaskLocation;            // Coordinates and place metadata
  dueDate?: string;                   // ISO-8601 string for hard deadline
  importance: ImportanceLevel;        // 'none' | 'low' | 'med-low' | 'med' | 'med-high' | 'high' | 'urgent' | 'do_now'
  completed: boolean;                 // Completion status
  completedAt?: string;               // ISO-8601 completion timestamp
  parentId?: string | null;           // Parent task ID if this is a subtask
  column: TaskColumn;                 // 'todo' | 'in_progress' | 'stuck'
  blockedByTaskId?: string | null;    // ID of blocking task if column is 'stuck'
  progressNotes: ProgressNote[];      // History of progress logs
  customReminders?: TaskReminder[];   // User-configured custom reminder offsets
  disableDefaultReminders?: boolean;  // Whether standard 15m/1h alerts are disabled
  createdAt: string;                  // ISO-8601 creation timestamp
  updatedAt: string;                  // ISO-8601 last update timestamp
}
```

### Calculated Priority
```typescript
export interface CalculatedPriority {
  score: number;                      // Priority score in hours (lower = sooner)
  baselineHours: number;              // Raw baseline or hard due date hours
  importanceDeduction: number;        // Subtracted hours based on importance
  distanceAddition: number;           // Added hours based on proximity
  distanceMiles: number | null;       // Great-circle distance in miles
  presumedDueDate: string;            // ISO-8601 string: now + score hours
  isOverdue: boolean;                 // True if past hard due date
}
```

### Display Task Entry
```typescript
export interface DisplayTaskEntry {
  displayId: string;                  // Unique key for rendering
  task: Task;                         // Underlying task entity
  type: 'yellow' | 'red';             // 'red' if hard due date; 'yellow' if calculated
  hoursAway: number;                  // Score hours away from now
  displayDate: string;                // ISO-8601 presumed due date
  priorityScore: number;              // Calculated priority score
  isSubtask: boolean;                 // True if parentId is defined
  hardDueDate?: string;               // Hard deadline if specified
  hardHoursAway?: number;             // Hours until hard deadline
}
```

---

## 8. Settings, Synchronization & iCloud Backup

### App Settings (`AppSettings`)
- `defaultBaselineHours`: Baseline lifespan for tasks without hard deadlines (default: 72h).
- `importanceDeductions`: Hours deducted per importance level.
- `distanceScalar`: Hours added per mile away (default: 1.5h/mi).
- `distanceOffset`: Buffer zone in miles before distance penalty begins (default: 0.5mi).
- `distanceCapHours`: Maximum hours distance can add to score (default: 72h).
- `triageThresholdHours`: Priority score threshold to enter Triage Deck (default: 24h).
- `proximityAlertRadiusMiles`: Background alert radius for nearby tasks (default: 1.0mi).
- `uiScale`: Global zoom multiplier (1.0 to 1.35) for comfortable reading on desktop/iPad.
- `theme`: `'system'` | `'light'` | `'dark'`.
- `autoSyncICloud`: Enables automated disk write/read to shared Documents folder.
- `autoSyncFileName`: Name of the sync file (default: `geodesic-tasks-backup.json`).
- `simulatedUserLocation`: Overrides device GPS for testing location scoring anywhere in the world.

### Persistence & Sync Architecture
1. **Local Storage:** Synchronously caches `geodesic_tasks_v1` and `geodesic_settings_v1` (with transparent backwards-compatible reading of legacy `chronos_*` keys).
2. **Capacitor Filesystem (Shared Documents / iCloud Drive):**
   - Automatically writes to the app's `Directory.Documents` folder on a 1.5-second debounce and on app backgrounding.
   - On launch and on returning to the foreground (`appStateChange`), Geodesic checks and syncs state from `geodesic-tasks-backup.json` (or `chronos-tasks-backup.json`).
3. **Manual Backup & Restore:** Complete JSON export and import available in Settings.

---

## 9. Mobile, iOS Safari & Touch Optimizations

- **Auto-Zoom Prevention on Input Focus:** In mobile Safari, form inputs with font sizes below 16px trigger an unwanted screen zoom. Geodesic eliminates this behavior across all text boxes, textareas, and subtask inputs via:
  - Responsive `text-base sm:text-xs` sizing.
  - Global mobile stylesheet rule enforcing `font-size: 16px !important` for form controls on viewports $\le$ 768px.
  - Viewport constraint meta tag: `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`.
- **Safe Area Insets:** Layout automatically respects iOS Dynamic Island, notch, and home bar spacing (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
- **Global UI Zoom:** User-selected UI scale applies directly to `document.documentElement.style.zoom`, uniformly scaling font sizes, modals, touch targets, and icons.

---

## 10. Tech Stack & Build System

- **Framework:** React 19 + TypeScript (Strict mode)
- **Bundler:** Vite
- **Styling:** Tailwind CSS (modern `@import "tailwindcss";` entry)
- **Icons:** Lucide React
- **Mapping:** Leaflet & OpenStreetMap
- **Mobile Native Runtime:** Capacitor (Core, Geolocation, Filesystem, App, Local Notifications)
- **Audio:** Web Audio API (native browser synthesized audio, zero dependencies)

### Verification Commands
```bash
# Type check and lint validation
npm run lint

# Production build verification
npm run build

# Sync web assets and Swift packages to iOS Xcode project
npx cap sync ios
```

### Xcode & Swift Package Manager (`CapApp-SPM`)
Capacitor 6+ manages native iOS plugins through Swift Package Manager (SPM) via a generated local package `CapApp-SPM`. If Xcode displays `Missing package product 'CapApp-SPM'`:
1. Ensure the web app is built: `npm run build`
2. Run `npx cap sync ios` in your project folder to generate/link the `CapApp-SPM` directory.
3. In Xcode's top menu bar, select **File** > **Packages** > **Reset Package Caches** (or **Resolve Package Versions**).

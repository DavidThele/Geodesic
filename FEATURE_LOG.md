## Feature Refinement: [Oct 7, 2026] - Estimated Time & Priority Scaling

**App State Context:**
Pivoting to manual triage enhancements within the React/Capacitor stack. Prioritizing features that require no external data APIs or background automation. 

**Ideated Feature: Time-Weighted Priority**
* **Concept:** Added an "Estimated Time to Complete" field to all tasks.
* **Mechanics:** Defaults to 10 minutes. Modifiable in `TaskModal.tsx`. 
* **Triage Integration:** Fed directly into the algorithm in `src/utils/priority.ts` to adjust task rank (e.g., boosting quick wins to reduce cognitive friction).

**Decisions Made:**
* *Accepted:* "Estimated Time" metadata and algorithmic integration.
* *Rejected:* Geofencing, Auto-completion, and Desktop widget handoffs.
* *Resolved Formulation:* Tasks &le; 10 minutes receive a dedicated quick-win priority deduction (-2.5h for &le;5m, -1.5h for &le;10m), pulling their presumed due date forward to encourage quick wins and alleviate task paralysis. Tasks > 10 minutes receive 0 duration deduction, relying strictly on explicit importance flags and deadlines. Default task duration is 10 minutes.

## Brainstorming Session: [Oct 7, 2026] - Mobile-First Triage & Flexibility

**App State Context:**
Pivoted away from location-based automation and Electron (desktop) handoffs per user constraints. Focus is now strictly on manual control, mobile (iOS) optimization, and smarter triage heuristics within the React/Capacitor stack.

**Ideated Features:**
1. **Dynamic Energy-State Triage:** Tagging tasks by required mental energy (Deep Work vs. Quick Win) and filtering `TriageView` based on the user's current state.
2. **Interactive "Micro-Triage" iOS Widget:** Using iOS App Intents on the `StatusWidget` to manually "Defer" or "Commit" to top priorities directly from the home screen without opening the app.
3. **The "Spillover" Rebalancer:** A feature in `CalendarView` that gracefully handles overdue tasks by placing them in a holding zone, with a one-tap algorithm to redistribute them across upcoming light days.

**Decisions Made:**
* *Rejected:* Auto-completion heuristics (too much risk for false positives).
* *Tabled:* Geofencing and routing integrations (insufficient current location-based data density).
* *De-prioritized:* Electron/Desktop continuity features.

**Open Questions:**
* For the Interactive Widget, should the "Defer" action automatically push the task to exactly tomorrow, or should it just push it back into the general unassigned `TriageView` pool?

## Brainstorming Session: [Oct 7, 2026] - Core Capabilities & Continuity

**App State Context:**
Evaluated the React/Vite web core integrated with Capacitor (iOS) and Electron (Desktop). Current capabilities feature advanced map/location integration, a unified Todo context, widget syncing logic, and sophisticated triage/priority views. 

**Ideated Features:**
1. **Geo-Triage Routing:** Merging `CalendarView` and `MapView` to create optimized physical routes for location-bound tasks.
2. **Desktop-to-Mobile Widget Handoff:** Electron idle-state detection that pushes the current active task directly to the iOS `StatusWidget`.
3. **Geofenced Zero-Touch Completion:** Auto-completing location-based tasks via background geolocation and queuing `celebration.ts` for the next app launch.
4. **Triage "Friction" Decay:** Adding a `skippedCount` to tasks in `TriageView` so chronic procrastination visually decays `TaskBubble` UI, prompting deletion or action.

**Decisions Made:**
* *Pending user review on which architectural direction (Location/Routing, Cross-device Sync, or Triage Heuristics) to prioritize next.*

**Open Questions:**
* Do we want to introduce background location permissions on iOS for the zero-touch completion feature?
* Are tasks synced via a remote database (e.g., Firebase/Supabase) to support the Desktop-to-Mobile handoff reliably, or is it strictly local/peer-to-peer right now?
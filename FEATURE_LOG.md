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
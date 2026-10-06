# Geodesic Home Screen & Lock Screen Widgets Setup

This directory contains the Swift widget code for **Geodesic** supporting:
- **Home Screen Widgets**: Small (2x2), Medium (3x2), Large (3x3)
- **Lock Screen Widgets**: Rectangular (top focus task + due time), Circular (active task count gauge), Inline (above the clock)

### Files:
- `GeodesicWidget.swift`: Defines the shared data models, App Group timeline provider, Home Screen views, Lock Screen views, and widget configurations.
- `StatusWidgetBundle.swift`: The `@main WidgetBundle` declaring `GeodesicHomeScreenWidget` and `GeodesicLockScreenWidget`.

---

### Step 1: Replace in Xcode
In your Xcode project under the `StatusWidget` target folder:
1. Replace `GeodesicWidget.swift` and `StatusWidgetBundle.swift` with the files in this directory.
2. In the right-hand Inspector, ensure their **Target Membership** has ✅ **`StatusWidgetExtension`** checked.
3. If you still have `LiveActivityPlugin.swift`, `LiveActivityPlugin.m`, `ViewController.swift`, `StatusWidgetLiveActivity.swift`, or `StatusWidgetAttributes.swift` in your Xcode project, delete them from Xcode (select "Move to Trash").

---

### Step 2: Enable App Groups (One-time, 30 seconds)
To allow the app to push live tasks into the widgets:
1. Click the top blue **App** project in Xcode.
2. Under **TARGETS**, select **App**:
   - Go to **Signing & Capabilities** → click **`+ Capability`** → add **App Groups**.
   - Check `group.com.davidthele.geodesic`.
3. Under **TARGETS**, select **StatusWidgetExtension**:
   - Go to **Signing & Capabilities** → click **`+ Capability`** → add **App Groups**.
   - Check `group.com.davidthele.geodesic`.

---

### Step 3: Sync & Run
In your Mac Terminal:
```bash
npm run build
npx cap sync ios
```
In Xcode, press **`Cmd + Shift + K`** (Clean), then **`Cmd + R`** (Run).

Your widgets will automatically reflect your live tasks on both your Home Screen and your Lock Screen!

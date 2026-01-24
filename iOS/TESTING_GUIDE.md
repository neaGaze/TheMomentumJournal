# MomentumJournal iOS Testing Guide

Comprehensive testing guide for device testing on iPhone 13.

---

## Prerequisites Checklist

Before testing, verify:

- [ ] **Xcode 15+** installed (check via `xcode-select -p`)
- [ ] **iPhone 13** available (or compatible iOS 15+ device)
- [ ] **USB-C/Lightning cable** for device connection
- [ ] **Apple ID** for signing (free or paid developer account)
- [ ] **Supabase project** with valid credentials (URL + anon key)
- [ ] **Internet connection** for initial dependency download

---

## Build and Deployment Steps

### 1. Configure Supabase Credentials

Open `MomentumJournal/Config.swift` and update:

```swift
struct Config {
    static let supabaseURL = "YOUR_SUPABASE_URL"       // e.g., https://xxx.supabase.co
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
}
```

Get these from: Supabase Dashboard > Project Settings > API

### 2. Connect iPhone via USB

1. Connect iPhone 13 to Mac using USB cable
2. Unlock iPhone when prompted
3. Tap "Trust" on iPhone when asked to trust this computer
4. Enter device passcode if prompted

### 3. Enable Developer Mode on iPhone

Required for iOS 16+:

1. Go to **Settings > Privacy & Security**
2. Scroll down to **Developer Mode**
3. Toggle **ON**
4. Tap **Restart** when prompted
5. After restart, tap **Turn On** to confirm
6. Enter device passcode

### 4. Open Project in Xcode

```bash
cd /Users/nigeshshakya/Documents/dev/TheMomentumJournal/iOS
open MomentumJournal.xcodeproj
```

Or: Xcode > File > Open > Navigate to project

### 5. Select Device in Xcode

1. Click device selector dropdown (top-left, near Run button)
2. Under "iOS Devices", select **iPhone 13** (or your device name)
3. Wait for Xcode to prepare device (status shown in toolbar)

### 6. Configure Code Signing

1. Select project in Navigator (blue icon, top of file list)
2. Select **MomentumJournal** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select **Team**: Your Personal Team (or Apple Developer Team)
6. If prompted, sign in with Apple ID

If bundle ID conflict:
- Change `PRODUCT_BUNDLE_IDENTIFIER` in Build Settings to unique value
- e.g., `com.yourname.momentumjournal`

### 7. Resolve SPM Dependencies

First build may need to fetch packages:

1. Xcode should auto-resolve (see progress in status bar)
2. If stuck: File > Packages > Reset Package Caches
3. Then: File > Packages > Resolve Package Versions

Dependencies:
- `supabase-swift` (2.0.0+)
- `KeychainAccess` (4.2.2+)

### 8. Build and Run

1. Press **Cmd+R** or click **Run** button (play icon)
2. Wait for build to complete (progress in toolbar)
3. App will install and launch on device

First run may take longer due to SPM compilation.

### 9. Trust Developer Certificate on iPhone

If app won't launch with "Untrusted Developer" error:

1. Go to iPhone **Settings > General > VPN & Device Management**
2. Find your Apple ID / Developer App certificate
3. Tap on it
4. Tap **Trust "[Your Apple ID]"**
5. Tap **Trust** in confirmation dialog
6. Re-run app from Xcode or tap app icon on device

---

## Test Scenarios

### Test 1: Full User Flow

**Objective**: Verify complete user journey

**Steps**:
1. Launch app (should show login screen)
2. Tap "Sign Up" link
3. Enter email, password (6+ chars), tap Sign Up
4. Verify redirect to main app (tab bar visible)
5. Go to Goals tab, tap + to create goal
6. Enter title "Test Goal", description, select category
7. Tap Save, verify goal appears in list
8. Go to Journal tab, tap + to create entry
9. Enter title, content (minimum text)
10. Select mood, optionally link to goal
11. Tap Save, verify entry appears
12. Go to Dashboard tab
13. Verify stats cards show correct counts
14. Recent activity shows created items
15. Go to Insights tab
16. Tap "Generate Insights"
17. Wait for AI analysis (may take 5-10s)
18. Verify insights display (patterns, recommendations)

**Expected**: All operations complete without crashes; data persists

### Test 2: Offline Mode Sync

**Objective**: Verify offline-first functionality

**Steps**:
1. Login to app with valid account
2. Create 1-2 goals and journals (verify they appear)
3. Enable **Airplane Mode** on iPhone (Control Center swipe)
4. Create new goal "Offline Goal"
5. Create new journal "Offline Journal"
6. Verify both appear in respective lists
7. Disable Airplane Mode
8. Pull-to-refresh on Goals list (if implemented)
9. Wait 5-10 seconds for background sync
10. Force quit app (swipe up from app switcher)
11. Reopen app
12. Verify offline items still exist
13. Check Supabase Dashboard - data should be synced

**Expected**: Local data persists offline; syncs when connection restored

### Test 3: Session Persistence

**Objective**: Verify authentication persists across app restarts

**Steps**:
1. Login with valid credentials
2. Navigate around app (Goals, Journals, Dashboard)
3. Force quit app (swipe up in app switcher)
4. Wait 10 seconds
5. Tap app icon to reopen
6. Verify still logged in (no login screen)
7. Verify data is intact

**Expected**: Session persists; no re-login required

### Test 4: Large Content Handling

**Objective**: Verify app handles large text content

**Preparation**: Copy 40KB of text (approx 40,000 characters)
- Can generate at: https://www.lipsum.com/ (set to ~8000 words)

**Steps**:
1. Go to Journal tab, create new entry
2. Paste 40KB text into content field
3. Add title, select mood
4. Tap Save
5. Verify entry appears in list
6. Tap entry to view detail
7. Verify full content displays (may need to scroll)
8. Force quit and reopen app
9. Navigate to journal entry
10. Verify content intact

**Expected**: Large content saves and loads without truncation or crash

### Test 5: Performance Under Load

**Objective**: Verify app performance with many records

**Steps**:
1. Create 50 goals (can use quick entries with minimal data)
   - Tip: Use short titles like "Goal 1", "Goal 2", etc.
2. Create 50 journal entries
3. Navigate to Dashboard
4. Time how long stats cards take to populate
5. Scroll through Goals list (should be smooth)
6. Scroll through Journals list
7. Generate Insights

**Expected**:
- Dashboard loads in <2 seconds
- Lists scroll smoothly (60fps)
- No memory warnings or crashes

### Test 6: 7-Day Expiry Check

**Objective**: Track build expiration for free provisioning

**Note**: Free Apple ID provisioning expires after 7 days

**Steps**:
1. Note today's date: `___________`
2. Note build date (visible in Settings > General > iPhone Storage > MomentumJournal)
3. Set calendar reminder for 7 days from build date
4. On day 7: App may crash on launch or show "App cannot be opened"
5. Rebuild from Xcode to renew provisioning

**Workaround for extended testing**:
- Use paid Apple Developer account ($99/year)
- Builds valid for 1 year

---

## Troubleshooting

### "Untrusted Developer" Error

**Symptom**: App installs but won't open; shows untrusted developer alert

**Fix**:
1. Settings > General > VPN & Device Management
2. Tap your developer certificate
3. Tap Trust
4. Relaunch app

### Build Failures

**Symptom**: Red error in Xcode, build fails

**Common fixes**:

1. **Clean build folder**: Cmd+Shift+K, then Cmd+B
2. **Delete Derived Data**:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. **Check signing**: Verify team selected in Signing & Capabilities
4. **Check device**: Ensure device still connected and trusted
5. **Restart Xcode**: Quit and reopen

### SPM Dependency Issues

**Symptom**: Package resolution fails, missing modules

**Fixes**:

1. File > Packages > Reset Package Caches
2. File > Packages > Resolve Package Versions
3. Close Xcode, delete:
   ```bash
   rm -rf ~/Library/Caches/org.swift.swiftpm
   ```
4. Reopen project

**Network issues**:
- Ensure no VPN blocking GitHub
- Try different network
- Check GitHub status: https://www.githubstatus.com/

### Supabase Connection Errors

**Symptom**: Login fails, data doesn't sync, network errors

**Checks**:

1. **Verify credentials in Config.swift**:
   - URL format: `https://xxxxx.supabase.co` (no trailing slash)
   - Key: Full anon key string

2. **Check Supabase project status**:
   - Dashboard: https://app.supabase.com
   - Verify project is running (not paused)

3. **Check RLS policies**:
   - Tables should allow authenticated user operations
   - Run test query in Supabase SQL editor

4. **Device network**:
   - Ensure device has internet access
   - Try Safari on device to verify connectivity
   - Check if corporate network blocks Supabase

5. **Debug in Xcode**:
   - View console logs (Cmd+Shift+C)
   - Look for network error messages

### App Crashes on Launch

**Symptom**: App immediately closes after launch

**Fixes**:

1. Check Xcode console for crash logs
2. Verify all required fields in Config.swift
3. Clean and rebuild
4. Delete app from device, reinstall
5. Check iOS version compatibility (minimum iOS 15)

### Device Not Showing in Xcode

**Symptom**: iPhone not in device dropdown

**Fixes**:

1. Unlock device and trust computer
2. Try different USB port/cable
3. Restart iPhone
4. Restart Xcode
5. Check: Window > Devices and Simulators
6. Update iOS if Xcode shows compatibility warning

---

## Quick Reference

| Action | Shortcut/Location |
|--------|------------------|
| Build | Cmd+B |
| Run | Cmd+R |
| Stop | Cmd+. |
| Clean | Cmd+Shift+K |
| Console | Cmd+Shift+C |
| Devices | Window > Devices and Simulators |
| Signing | Project > Target > Signing & Capabilities |
| Packages | File > Packages |

---

## Support

For issues not covered here:
- Check Xcode release notes for known issues
- Apple Developer Forums: https://developer.apple.com/forums/
- Stack Overflow: Tag `ios`, `swiftui`, `xcode`

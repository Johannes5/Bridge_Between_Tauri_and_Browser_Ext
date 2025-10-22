# Testing Multi-Browser Support

## Current Status
- ✅ Sidecar rebuilt with browser detection
- ✅ Extension rebuilt with connection tracking
- ✅ Tauri app running with multi-connection support
- ✅ Old processes killed

## Steps to Test

### 1. Open Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Find your extension
4. Click **Reload** (circular arrow icon)
5. Open Chrome's DevTools → Console
6. Look for: `[bridge-ext] Connection established: Chrome (...)`

### 2. Check Tauri App
After Chrome connects, you should see:
```
Current Window Tabs - Chrome
Connection: [some-id] • Last update: [time]
[Your Chrome tabs listed here]
```

### 3. Open Comet (Perplexity)
1. Open Comet browser
2. Go to `comet://extensions/` or find extensions in settings
3. Reload your extension
4. Check console for: `[bridge-ext] Connection established: Comet (...)`

### 4. Check Tauri App Again
Now you should see **TWO sections**:
```
Current Window Tabs - Chrome
[Chrome tabs]

Current Window Tabs - Comet
[Comet tabs]
```

## Troubleshooting

### If you see "Extension: online" but no browser sections:

**Check sidecar logs:**
The sidecar prints to stderr when launched. To see logs:
1. Open terminal
2. Run manually:
```powershell
& "C:\Users\Johannes\Documents\Programming\bridge workspace\packages\sidecar\target\release\bridge-sidecar.exe"
```
3. You should see:
```
[sidecar] Connection ID: [id]
[sidecar] Browser: Chrome (or Comet)
```

### If sidecar can't detect browser:
The sidecar uses `wmic` to detect the parent process. If detection fails:

**Manually set browser name:**
1. Open Registry Editor
2. Go to: `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app`
3. Check the manifest path
4. Edit the manifest to add environment variable in the startup script

Or simpler: Check sidecar terminal output when it launches.

### Expected Terminal Output from Sidecar:
```
[sidecar] Connection ID: 18d4f2a-3b9c
[sidecar] Browser: Chrome
```

### Check Browser Console
In the extension's background service worker console, you should see:
```
[bridge-ext] Connection established: Chrome (18d4f2a-3b9c)
```

### Check Tauri App Terminal
Look for:
```
[app] Connection registered: 18d4f2a-3b9c (Some("Chrome"))
```

## What Success Looks Like

**Tauri App UI:**
```
╔══════════════════════════════════════════════╗
║ Presence                                     ║
║ App: online                                  ║
║ Extension: online                            ║
║ Sidecar: online                             ║
╚══════════════════════════════════════════════╝

╔══════════════════════════════════════════════╗
║ Current Window Tabs - Chrome         [Save] ║
║ Connection: 18d4f2a-3b9c • Last: 2:00 PM   ║
║ ┌───────────────────────────────────────┐   ║
║ │ Tab 1 | url1 | time | [Focus]        │   ║
║ │ Tab 2 | url2 | time | [Focus]        │   ║
║ └───────────────────────────────────────┘   ║
╚══════════════════════════════════════════════╝

╔══════════════════════════════════════════════╗
║ Current Window Tabs - Comet          [Save] ║
║ Connection: 18d4f3e-4c2d • Last: 2:01 PM   ║
║ ┌───────────────────────────────────────┐   ║
║ │ Tab 1 | url1 | time | [Focus]        │   ║
║ │ Tab 2 | url2 | time | [Focus]        │   ║
║ └───────────────────────────────────────┘   ║
╚══════════════════════════════════════════════╝
```

**Actions:**
- Click [Focus] on a Chrome tab → Opens in Chrome
- Click [Focus] on a Comet tab → Opens in Comet
- Click [Save These Tabs] → Saves with browser label
- Restore saved tabs → Opens in original browser

## If It Still Doesn't Work

1. **Check file timestamps:**
```powershell
Get-Item "C:\Users\Johannes\Documents\Programming\bridge workspace\packages\sidecar\target\release\bridge-sidecar.exe" | Select-Object LastWriteTime
```
Should be TODAY's date

2. **Verify WebSocket connections:**
```powershell
netstat -ano | findstr "17342"
```
Should show ESTABLISHED connections

3. **Check browser console for errors:**
Look for any red errors in background service worker console

4. **Restart everything:**
- Stop Tauri app (Ctrl+C in terminal)
- Close ALL browsers
- Restart Tauri app: `cd packages\app-tauri && pnpm dev`
- Open browsers again



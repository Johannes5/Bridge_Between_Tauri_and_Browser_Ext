# Debug Routing Issues

## What Was Fixed

1. ✅ **Browser detection** - Now skips "bridge-sidecar.exe" to find actual browser
2. ✅ **Connection cleanup** - Removes disconnected browsers from UI
3. ✅ **Debug logging** - Added extensive logging to trace message routing

## How to Debug with New Logging

### 1. Restart Tauri App

**IMPORTANT:** You must restart the Tauri app to get the new Rust code with debug logging!

```powershell
# Stop the app (Ctrl+C in terminal)
# Then restart:
cd packages\app-tauri
pnpm dev
```

### 2. Reload Extensions

In each browser:
- Chrome: `chrome://extensions/` → Reload
- Comet: `comet://extensions/` → Reload

### 3. Watch All Logs

**Tauri Terminal** (where you ran `pnpm dev`):
```
[app] Connection registered: 19a06... (Some("chrome.exe"))
[app] Routing to connection: 19a06...
[app] Available connections: ["19a06...", "19a07..."]
[app] Found target connection, sending message
```

**Browser Console** (extension background service worker):
```
[bridge-ext] Connection established: chrome.exe (19a06...)
```

**Browser Console** (Tauri app - press F12):
```
[bridge-app] Sending tabs.openOrFocus: {url: "...", connectionId: "19a06..."}
```

### 4. Test Focus Button

1. Click **[Focus]** on any tab
2. Check **Tauri terminal** for routing logs:
   ```
   [app] Routing to connection: 19a06a74658-3b58
   [app] Available connections: ["19a06a74658-3b58", "19a06a6eedd-b358"]
   [app] Found target connection, sending message
   ```
3. Check **browser console** for:
   ```
   [bridge-app] Sending tabs.openOrFocus: {
     url: "https://example.com",
     connectionId: "19a06a74658-3b58",
     matchStrategy: "origin"
   }
   ```

## Expected Log Sequence

### When Browser Connects:
```
Tauri Terminal:
[app] Connection registered: 19a06a74658-3b58 (Some("chrome.exe"))

Extension Console:
[bridge-ext] Connection established: chrome.exe (19a06a74658-3b58)
```

### When Clicking Focus:
```
Browser Console (Tauri app DevTools):
[bridge-app] Sending tabs.openOrFocus: {
  url: "https://...",
  connectionId: "19a06a74658-3b58"
}

Tauri Terminal:
[app] Routing to connection: 19a06a74658-3b58
[app] Available connections: ["19a06a74658-3b58"]
[app] Found target connection, sending message
```

### When Clicking Restore:
```
Browser Console:
[bridge-app] Sending tabs.restore: {
  urls: ["https://..."],
  connectionId: "19a06a74658-3b58",
  newWindow: true
}

Tauri Terminal:
[app] Routing to connection: 19a06a74658-3b58
[app] Found target connection, sending message
```

## Common Issues

### Issue: "Target connection not found"

**Logs show:**
```
[app] Routing to connection: 19a069bfa9f-adfc
[app] Available connections: ["19a06a74658-3b58"]
[app] Target connection not found: 19a069bfa9f-adfc
```

**Problem:** Connection ID mismatch - trying to route to old/stale connection

**Solution:** 
- The UI has a stale connectionId
- Reload the extension
- The old connection should disappear from UI when presence.status offline is received

### Issue: "Broadcasting to 0 connections"

**Logs show:**
```
[app] Broadcasting to 0 connections
```

**Problem:** No browsers connected

**Solution:**
- Check if extensions are loaded
- Check if sidecar processes are running: `Get-Process bridge-sidecar`
- Check WebSocket connections: `netstat -ano | findstr "17342"`

### Issue: Browser shows as "bridge-sidecar.exe"

**Extension console shows:**
```
[bridge-ext] Connection established: bridge-sidecar.exe (...)
```

**Problem:** Browser detection failed

**Debug:**
1. Run sidecar manually to see what it detects:
```powershell
& "C:\Users\Johannes\Documents\Programming\bridge workspace\packages\sidecar\target\release\bridge-sidecar.exe"
```
2. Should print:
```
[sidecar] Connection ID: ...
[sidecar] Browser: chrome.exe
```

## Debugging Checklist

- [ ] Tauri app restarted with new Rust code
- [ ] Extensions reloaded (not just page refresh)
- [ ] All processes visible: `Get-Process bridge-sidecar`
- [ ] WebSocket connections established: `netstat -ano | findstr "17342"`
- [ ] Browser names showing correctly (not cmd.exe or bridge-sidecar.exe)
- [ ] Connection IDs match between extension and app
- [ ] Clicking Focus shows routing logs in Tauri terminal
- [ ] Tab actually focuses in browser

## Success Criteria

✅ Browser name is "chrome.exe" or "Comet.exe" (not bridge-sidecar.exe)
✅ Clicking Focus shows "Found target connection, sending message"
✅ Tab actually focuses/activates in the correct browser
✅ Clicking Restore shows same routing and opens tabs
✅ Disconnecting browser removes its section from UI
✅ Multiple browsers show as separate sections

## If It Still Doesn't Work

Post these logs:

1. **From Tauri terminal when clicking Focus:**
   - The routing logs
   - Available connections list

2. **From browser console (Tauri app F12):**
   - The payload being sent

3. **From extension console:**
   - Connection established message
   - Any errors

This will help identify where the routing is breaking.



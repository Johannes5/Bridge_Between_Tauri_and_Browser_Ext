# Windows Native Messaging Registry Fix

## Problem Summary

You were encountering the error:
```
Unchecked runtime.lastError: Specified native messaging host not found.
```

Even though:
- ✅ The manifest file existed at `C:\Users\Johannes\AppData\Local\{Browser}\User Data\NativeMessagingHosts\com.bridge.app.json`
- ✅ The manifest had the correct extension ID in `allowed_origins`
- ✅ The sidecar executable existed at the specified path
- ✅ The extension had `nativeMessaging` permission

## Root Cause

**On Windows, browsers require native messaging hosts to be registered in the Windows Registry.**

The browser doesn't look for manifest files in the `NativeMessagingHosts` folder the way it does on macOS/Linux. Instead, it queries the Windows Registry at:

```
HKEY_CURRENT_USER\Software\{BrowserVendor}\{BrowserName}\NativeMessagingHosts\{HostName}
```

The registry key's `(Default)` value must contain the **absolute path to the manifest JSON file**.

## Solution Implemented

Created two PowerShell scripts:

### 1. `install-windows.ps1`
- Builds the correct manifest JSON file
- Saves it to `packages/sidecar/manifests/com.bridge.app.json`
- Registers the manifest path in Windows Registry for Chrome, Edge, and Brave
- Validates the sidecar executable exists

### 2. `uninstall-windows.ps1`
- Removes registry entries for the native messaging host
- Useful for cleanup or reinstallation

## How It Works

When you run:
```powershell
.\install-windows.ps1 -ExtensionId "anlnmjdkhinpnimhpeafdchenbhjdble" -Browser all
```

The script:

1. **Validates** the sidecar executable exists:
   ```
   C:\Users\Johannes\Documents\Programming\bridge workspace\packages\sidecar\target\release\bridge-sidecar.exe
   ```

2. **Generates** the manifest JSON:
   ```json
   {
     "name": "com.bridge.app",
     "description": "Bridge between extension and Tauri app",
     "path": "C:\\Users\\Johannes\\...\\bridge-sidecar.exe",
     "type": "stdio",
     "allowed_origins": ["chrome-extension://anlnmjdkhinpnimhpeafdchenbhjdble/"]
   }
   ```

3. **Registers** in Windows Registry:
   ```
   HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app
   HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bridge.app
   HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.bridge.app
   ```
   
   Each key's `(Default)` value points to the manifest JSON file path.

4. **Browser lookup flow:**
   ```
   Extension calls chrome.runtime.connectNative("com.bridge.app")
     ↓
   Browser queries registry: HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app
     ↓
   Gets manifest path: C:\...\packages\sidecar\manifests\com.bridge.app.json
     ↓
   Reads manifest, validates extension ID, launches executable
     ↓
   Establishes stdio connection
   ```

## Verification

You can verify the installation worked:

```powershell
# Check registry entry
Get-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app"

# Verify manifest file
Get-Content "packages\sidecar\manifests\com.bridge.app.json"

# Test sidecar executable
Test-Path "packages\sidecar\target\release\bridge-sidecar.exe"
```

## Next Steps

After installation:

1. **Restart your browser** - Required for registry changes to take effect
2. **Reload the extension** - From chrome://extensions or edge://extensions
3. **Check background console** - Look for successful connection logs in the extension's service worker console
4. **Test functionality** - Try the native messaging features

## Future Considerations

### For Production/Distribution

When distributing the application to end users:

1. **Installer Package**: Bundle the installation script in your installer (MSI, InnoSetup, etc.)
2. **Auto-detect Extension ID**: The installer should detect installed extensions or prompt for ID
3. **Post-install Hook**: Run the installation script automatically after installing the Tauri app
4. **Update Handling**: Re-run installation when the app updates (if path changes)
5. **Multi-user**: Consider HKEY_LOCAL_MACHINE for system-wide installation (requires admin)

### For Development

- Keep using the manual installation script
- Re-run only when extension ID changes
- Sidecar rebuilds don't require re-registration (path stays the same)

## Documentation

Full documentation available in:
- [manifests/README.md](./README.md) - Complete guide and troubleshooting
- [packages/sidecar/README.md](../README.md) - Quick setup guide

## References

- [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Native Messaging Host Location (Windows)](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host-location)


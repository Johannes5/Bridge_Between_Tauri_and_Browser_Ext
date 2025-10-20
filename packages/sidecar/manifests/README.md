# Native Messaging Host Manifests

This directory contains manifest files and installation scripts for the Bridge native messaging host, which enables communication between the Plasmo browser extension and the Tauri desktop application.

## The Problem

On Windows, simply placing the manifest JSON file in the browser's `NativeMessagingHosts` directory is **not sufficient**. You may encounter the error:

```
Unchecked runtime.lastError: Specified native messaging host not found.
```

This happens because **Windows requires native messaging hosts to be registered in the Windows Registry**.

## Solution

Use the provided installation scripts to properly register the native messaging host.

### Windows Installation

#### Prerequisites

1. Build the sidecar executable:
   ```powershell
   cd packages/sidecar
   cargo build --release
   ```

2. Note your extension ID. You can find it in:
   - Chrome: `chrome://extensions/` (enable Developer mode)
   - Edge: `edge://extensions/` (enable Developer mode)
   - Brave: `brave://extensions/` (enable Developer mode)

#### Install

Run the installation script from the manifests directory:

```powershell
cd packages/sidecar/manifests
.\install-windows.ps1 -ExtensionId "your-extension-id" -Browser all
```

**Parameters:**
- `-ExtensionId`: Your browser extension ID (required)
- `-Browser`: Target browser - `chrome`, `edge`, `brave`, or `all` (default: `chrome`)

**Examples:**

Install for all browsers:
```powershell
.\install-windows.ps1 -ExtensionId "anlnmjdkhinpnimhpeafdchenbhjdble" -Browser all
```

Install for Chrome only:
```powershell
.\install-windows.ps1 -ExtensionId "anlnmjdkhinpnimhpeafdchenbhjdble" -Browser chrome
```

#### What the Script Does

1. Verifies the sidecar executable exists
2. Generates the manifest JSON file with:
   - Correct absolute path to the executable (with escaped backslashes)
   - Your extension ID in `allowed_origins`
3. Registers the manifest in Windows Registry at:
   - `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app`
   - `HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bridge.app`
   - `HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.bridge.app`

#### After Installation

1. **Restart your browser** (important!)
2. **Reload the extension** from the extensions page
3. Check the extension's background service worker console for connection status
4. You should see successful native messaging connection logs

#### Uninstall

To remove the native messaging host registration:

```powershell
cd packages/sidecar/manifests
.\uninstall-windows.ps1 -Browser all
```

### macOS/Linux Installation

*(To be documented - similar concept but uses file-based registration in user directories)*

## Technical Details

### Windows Registry Keys

Native messaging hosts on Windows must be registered in the registry. The browser looks for:

```
HKEY_CURRENT_USER\Software\{Browser}\NativeMessagingHosts\{HostName}
```

Where:
- `{Browser}` is `Google\Chrome`, `Microsoft\Edge`, or `BraveSoftware\Brave-Browser`
- `{HostName}` is `com.bridge.app` (must match the `name` field in manifest)

The registry key's default value should be the **absolute path** to the manifest JSON file.

### Manifest File Format

```json
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "C:\\Path\\To\\bridge-sidecar.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://your-extension-id/"
  ]
}
```

**Important:**
- `path` must be an absolute path with escaped backslashes on Windows
- `allowed_origins` must include the exact extension ID with trailing slash
- The host name in `chrome.runtime.connectNative()` must match the `name` field

### Extension Code

In the extension's background script:

```typescript
const HOST_NAME = "com.bridge.app";
const port = chrome.runtime.connectNative(HOST_NAME);
```

The `HOST_NAME` must exactly match:
1. The manifest file's `name` field
2. The registry key name
3. The manifest filename (without .json extension)

## Troubleshooting

### Error: "Specified native messaging host not found"

**Causes:**
- Native messaging host not registered in Windows Registry
- Manifest file path in registry is incorrect
- Extension ID mismatch in `allowed_origins`
- Sidecar executable doesn't exist at specified path
- Browser not restarted after installation

**Solutions:**
1. Run the installation script
2. Verify the sidecar executable exists: `Test-Path "path\to\bridge-sidecar.exe"`
3. Check registry entry: `Get-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app"`
4. Restart browser and reload extension
5. Verify extension ID matches exactly

### Error: "Access denied" when running install script

**Solution:** Run PowerShell as Administrator, or ensure you have write access to `HKEY_CURRENT_USER`.

### Connection works but then disconnects

**Causes:**
- Sidecar process crashed
- Communication protocol mismatch
- Invalid message format

**Solutions:**
1. Check sidecar logs
2. Test sidecar manually
3. Verify message schemas match between extension and sidecar

## Development Workflow

For development, after any change to the sidecar:

1. Rebuild: `cargo build --release`
2. The manifest already points to the release binary
3. Restart the sidecar process (it will be auto-restarted by the extension)
4. No need to re-run install script unless extension ID changes

## References

- [Chrome Native Messaging Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Native Messaging Host on Windows](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host-location)


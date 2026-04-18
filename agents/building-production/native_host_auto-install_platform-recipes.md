# Platform Recipes

## Purpose
This document translates the existing shell/PowerShell scripts into platform-by-platform implementation requirements. It should be treated as the operational reference while building the Rust-native installer/checker in the Tauri app.

Use this with:
- [Main plan](native_host_auto-install_7f6f7fae.plan.md)
- [Code map](native_host_auto-install_code-map.md)

## Core invariant on every platform
The extension will only connect if a native host named `com.bridge.app` is discoverable and its manifest authorizes the installed extension ID.

Required manifest shape:

```json
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "/absolute/path/to/bridge-sidecar",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://stable-extension-id/"
  ]
}
```

The implementation must preserve:
- `name = "com.bridge.app"`
- `type = "stdio"`
- absolute executable `path`
- stable production `allowed_origins`

## Windows recipe

### What exists today
The current reference behavior is in `packages/sidecar/manifests/install-windows.ps1`.

That script:
1. Locates the sidecar executable.
2. Writes `com.bridge.app.json`.
3. Registers one or more `HKCU` native-host keys pointing at that manifest.

### Registry keys currently used
- `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app`
- `HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bridge.app`
- `HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.bridge.app`

### Required production behavior
Implement the equivalent in Rust:
1. Resolve installed sidecar path.
2. Resolve an app-controlled manifest path.
3. Render manifest JSON.
4. Write the manifest only if contents differ.
5. Create or repair each `HKCU` registry value.
6. Verify the registry points to the intended manifest.

### Recommended manifest path strategy
Use a stable per-user location owned by the app, such as:
- `%LOCALAPPDATA%\Bridge\NativeMessagingHosts\com.bridge.app.json`

This avoids coupling the registry directly to repo paths or temporary install-time paths.

### Recommended sidecar path strategy
Prefer one of:
- installed app directory if updates preserve the path, or
- `%LOCALAPPDATA%\Bridge\bin\bridge-sidecar.exe` managed by the app/installer

The key requirement is path stability across updates.

### Windows-specific pitfalls
- Do not write only to the browser profile `NativeMessagingHosts` directory and assume that is enough.
- Do not require admin privileges.
- Do not write `HKLM`.
- Do not assume the app install path is immutable unless the packaging system guarantees it.

### Windows verification checklist
- Sidecar exists at the resolved path.
- Manifest JSON exists.
- Manifest JSON is valid.
- Registry key exists for each targeted browser.
- Registry default value equals manifest path.
- Manifest `allowed_origins` contains the correct stable ID for that browser.

## macOS recipe

### What exists today
The current reference behavior is in `packages/sidecar/manifests/install-mac.sh`.

It writes the host manifest into user-level browser directories such as:
- `~/Library/Application Support/Google/Chrome/NativeMessagingHosts`
- `~/Library/Application Support/Microsoft Edge/NativeMessagingHosts`
- `~/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts`
- `~/Library/Application Support/Chromium/NativeMessagingHosts`

### Required production behavior
Implement equivalent file writes from the app:
1. Resolve a stable installed sidecar path.
2. Detect which browser roots exist.
3. Ensure `NativeMessagingHosts` exists.
4. Write or repair `com.bridge.app.json`.
5. Verify file contents.

### Recommended sidecar path strategy
Prefer one of:
- sidecar bundled within the installed `.app` bundle, if the path is stable and executable
- sidecar copied into an app-owned support directory under the user domain

### macOS-specific pitfalls
- Avoid using an app path while the app is running from a DMG or a translocated location.
- Avoid writing manifests that reference temporary or not-yet-installed bundle paths.
- If the bundle path can move between updates, make startup rewrite logic mandatory.

### macOS verification checklist
- Browser support root exists.
- `NativeMessagingHosts/com.bridge.app.json` exists.
- Manifest contents match desired content.
- Sidecar path exists and is executable.
- Relaunching the app does not rewrite unchanged files unnecessarily.

## Linux recipe

### What exists today
The current reference behavior is in `packages/sidecar/install.sh`.

It targets user-level config dirs:
- `~/.config/google-chrome/NativeMessagingHosts`
- `~/.config/chromium/NativeMessagingHosts`
- `~/.config/microsoft-edge/NativeMessagingHosts`
- `~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts`

### Required production behavior
Implement equivalent file writes from the app:
1. Resolve a stable sidecar path.
2. Detect supported browser config roots.
3. Ensure `NativeMessagingHosts` exists.
4. Write or repair the manifest.
5. Verify file contents and executable path.

### Recommended sidecar path strategy
Strong options:
- distro package path from `.deb` or `.rpm`
- app-managed user path under XDG data/state directories

Avoid:
- transient AppImage mount locations
- repository-relative paths
- temp build output paths

### Linux-specific pitfalls
- If Linux distribution format is undecided, the app may need to self-stage the sidecar into a stable user path.
- If AppImage remains a goal, define an explicit copy-to-stable-location strategy before manifest creation.
- Do not assume every Chromium variant uses the same config root casing.

### Linux verification checklist
- Target config root exists or was created intentionally.
- `NativeMessagingHosts/com.bridge.app.json` exists.
- Manifest contents match desired content.
- Sidecar path is executable and stable across relaunches.

## Browser support recipes

### Chrome
- Supported everywhere.
- Treat as Tier 1.
- Use stable published extension ID if possible.

### Edge
- Supported everywhere native-host paths are already documented.
- Treat as Tier 1 if release-tested.

### Brave
- Supported everywhere current scripts already target.
- Treat as Tier 1 or Tier 2 depending on actual release testing.

### Comet
- Current repo/docs discuss Comet as a real target, but the installer paths are not yet codified in the scripts shown here.
- Implementation should explicitly add Comet path resolution per OS if it remains a Tier 1 browser.
- Do not leave Comet as an implicit “Chromium-like” target without tested paths.

### Chromium
- Safe as a best-effort target if path roots are known and testing is lighter.

### Firefox
- Keep out of the first implementation unless:
  - the extension packaging path is settled
  - native-host registration locations are explicitly implemented
  - protocol parity is verified

## Manifest rendering rules

### Do
- Generate JSON from structured Rust data.
- Keep a deterministic field order if practical for easier diffing.
- Compare file contents before rewriting.
- Support one or more allowed origins according to final browser strategy.

### Do not
- Hand-edit a checked-in manifest for production.
- Embed repo-relative build paths.
- Prompt users for extension IDs.
- Rely on shell scripts at runtime in the production app.

## Suggested target data model

```text
BrowserTarget {
  browser_kind,
  support_tier,
  extension_id,
  manifest_file_path,
  registry_key_path_optional,
  browser_detected,
}
```

## Suggested verify result model

```text
BrowserInstallStatus {
  browser_kind,
  detected,
  manifest_path,
  manifest_exists,
  manifest_matches_expected,
  registry_ok_optional,
  sidecar_exists,
  sidecar_executable,
  action_taken,
  warning_optional,
}
```

## Decision defaults for the implementing teammate
Unless the product owner changes scope, assume:
- Chrome, Edge, Brave, and Comet are the intended real-user targets
- Chromium is best-effort
- Firefox is deferred
- Windows uses `HKCU`
- macOS/Linux use user-level `NativeMessagingHosts`
- app startup performs verify-then-repair on every launch

## Acceptance bar by platform

### Minimum acceptable
- App launch repairs setup automatically.
- Extension can connect without manual manifest edits.
- No admin permissions required.

### Better
- The app logs a precise per-browser status.
- Broken setup can be repaired by simply relaunching the app.

### Best
- The frontend exposes a diagnostics summary and a “repair integration” action.

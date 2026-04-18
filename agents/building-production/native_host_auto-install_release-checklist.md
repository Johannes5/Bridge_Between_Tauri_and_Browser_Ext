# Release and Verification Checklist

## Purpose
This file is the execution checklist for the implementing teammate after the native-host self-installation work is coded. It is intentionally operational and can also be used by another LLM as the final verification spec.

Use this with:
- [Main plan](native_host_auto-install_7f6f7fae.plan.md)
- [Implementation blueprint](native_host_auto-install_execution-blueprint.md)

## Definition of done
All of the following must be true:
- A real user only needs to install the app and the extension.
- No manual `com.bridge.app.json` editing is required.
- No manual registry work is required.
- The app self-heals missing or stale native-host setup on launch.
- The extension connects successfully through `connectNative("com.bridge.app")`.
- Docs clearly separate dev setup from production behavior.

## Pre-release decisions
Before final validation, confirm:
- production extension IDs are finalized
- supported Tier 1 browsers are finalized
- Firefox is either fully implemented or explicitly deferred
- Linux packaging strategy is finalized enough to guarantee a stable sidecar path
- Comet path support is explicit wherever Comet is promised

## Code review checklist

### Architecture
- A dedicated Tauri native-host module exists.
- Platform-specific behavior is isolated by file/module.
- Manifest rendering is centralized.
- Verify/rewrite logic is centralized and idempotent.

### Runtime behavior
- The app checks native-host setup on every launch, not only first run.
- Partial failures log warnings instead of breaking the entire app.
- Truly fatal errors are limited to missing core prerequisites such as unresolved sidecar path.

### Security posture
- Windows writes `HKCU`, not `HKLM`.
- The app only writes known native-host locations.
- The app only manages `com.bridge.app`.
- The app does not shell out to external install scripts in production.

## Platform validation checklist

## Windows

### Fresh machine / fresh user profile
- Install the app.
- Install the production extension.
- Launch the app.
- Confirm the app creates or repairs:
  - sidecar path reference
  - manifest file
  - `HKCU` registry key(s)
- Restart the browser if required by product flow.
- Confirm the extension connects without manual steps.

### Repair scenarios
- Delete the manifest file and relaunch the app.
- Break the registry value and relaunch the app.
- Update the app so the sidecar path changes and relaunch the app.
- Add a newly supported browser after the app is already installed and relaunch the app.

### Expected results
- Missing pieces are recreated.
- Existing correct pieces are not rewritten unnecessarily.
- Logs clearly state what changed.

## macOS

### Fresh machine / fresh user profile
- Install the app in its intended final location.
- Install the production extension.
- Launch the app.
- Confirm the app writes `com.bridge.app.json` into the correct user browser directories.
- Confirm the manifest references a stable installed sidecar path.
- Confirm the extension connects.

### Repair scenarios
- Delete one browser’s manifest and relaunch the app.
- Move/update the app if the bundle path changes and relaunch the app.
- Install a newly supported browser later and relaunch the app.

### Expected results
- Missing manifests are recreated.
- No dependence on manual shell scripts.
- No dependence on temporary/translocated app paths.

## Linux

### Fresh machine / fresh user profile
- Install the app in the intended package/distribution form.
- Install the production extension.
- Launch the app.
- Confirm the app writes manifests to the intended user config locations.
- Confirm the manifest points to a stable sidecar path.
- Confirm the extension connects.

### Repair scenarios
- Delete a manifest and relaunch the app.
- Change the sidecar path due to an update and relaunch the app.
- Add a new supported browser later and relaunch the app.

### Expected results
- Repair works without user action beyond launching the app.
- AppImage or similar transient path issues are either solved or explicitly unsupported.

## Browser matrix
Run at least this matrix unless product scope narrows:
- Windows: Chrome, Edge, Brave, Comet
- macOS: Chrome, Edge, Brave, Chromium, Comet if supported
- Linux: Chrome, Edge, Brave, Chromium, Comet if supported
- Firefox only if intentionally kept in scope

For each browser verify:
- native host discovered
- extension connects
- app sees the browser connection
- `tabs.list` works
- `tabs.openOrFocus` works

## Upgrade and migration checklist
- Existing dev/manual setup does not break production auto-install.
- Old manifest locations are either respected or migrated.
- Old incorrect sidecar paths are repaired.
- The app still works if manual scripts were previously used.

## Logging checklist
- Startup logs whether native-host verification ran.
- Logs include per-browser result status.
- Logs state whether manifest was written, skipped, or repaired.
- Windows logs state whether registry entries were written, skipped, or repaired.
- Errors include enough path information to diagnose failures.

## Documentation checklist
Update:
- `README.md`
- `packages/app-tauri/README.md`
- `packages/sidecar/README.md`
- `packages/sidecar/manifests/README.md`
- `docs/windows-dev-setup.md`
- add a new production release/integration doc if needed

Documentation must state:
- real users do not manually edit manifests
- the app performs native-host setup automatically
- dev scripts remain for development and manual recovery only
- supported browsers and limits are explicit

## Nice-to-have but not required for v1
- frontend diagnostics panel for browser integration status
- manual “Repair integration” button
- analytics/telemetry on repair outcomes if privacy policy allows

## Final signoff questions
The change is ready to ship only if these can be answered “yes”:
- Can a non-technical user install the app and extension and get a working bridge?
- Can the app repair broken native-host setup by itself?
- Are production extension IDs stable and baked into the release path?
- Is each supported browser backed by explicit tested path logic?
- Do the docs now reflect the real production story?

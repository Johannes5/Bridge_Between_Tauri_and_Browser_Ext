# Implementation Blueprint

## Purpose
This is the execution-oriented companion to the main plan. It is intentionally more concrete and should help another engineer or LLM implement the work in a sensible order with fewer architectural detours.

Use this with:
- [Main plan](native_host_auto-install_7f6f7fae.plan.md)
- [Code map](native_host_auto-install_code-map.md)
- [Platform recipes](native_host_auto-install_platform-recipes.md)

## Recommended implementation order

### Step 1. Introduce a new Tauri native-host module
Add a new module tree under `packages/app-tauri/src-tauri/src/`.

Suggested layout:
- `native_host/mod.rs`
- `native_host/config.rs`
- `native_host/types.rs`
- `native_host/paths.rs`
- `native_host/render.rs`
- `native_host/install.rs`
- `native_host/verify.rs`
- `native_host/platform_windows.rs`
- `native_host/platform_macos.rs`
- `native_host/platform_linux.rs`

### Step 2. Add the basic data types first
Create stable shared internal models before writing platform code.

Suggested types:

```rust
pub enum BrowserKind {
    Chrome,
    Edge,
    Brave,
    Comet,
    Chromium,
    Firefox,
}

pub struct BrowserTarget {
    pub kind: BrowserKind,
    pub extension_id: String,
    pub manifest_path: std::path::PathBuf,
    pub registry_key: Option<String>,
    pub detected: bool,
}

pub enum InstallAction {
    Unchanged,
    ManifestWritten,
    RegistryWritten,
    ManifestAndRegistryWritten,
    SkippedNotDetected,
    WarningOnly,
}

pub struct BrowserInstallStatus {
    pub kind: BrowserKind,
    pub detected: bool,
    pub action: InstallAction,
    pub manifest_path: std::path::PathBuf,
    pub warning: Option<String>,
}

pub struct NativeHostStatus {
    pub sidecar_path: std::path::PathBuf,
    pub browsers: Vec<BrowserInstallStatus>,
}
```

### Step 3. Centralize extension-ID configuration
Do this early so manifest rendering is deterministic.

Recommended design:
- one Rust config source for production IDs
- optional alternate config source for private fixed-key builds

Possible implementation forms:
- compile-time constants in `config.rs`
- generated Rust file from build metadata
- environment-driven build step that bakes IDs into the app

Recommended default:
- compile-time explicit constants for published production IDs
- optional override mechanism for private distributions

### Step 4. Implement sidecar path resolution
This must exist before platform writers are implemented.

The function should return a stable path or a clear error:

```rust
pub fn resolve_sidecar_path() -> anyhow::Result<PathBuf>
```

Expected behavior:
- Windows: return installed `.exe` path
- macOS: return stable bundle/support path
- Linux: return package path or app-managed stable copy

Add guards for:
- file missing
- not executable on Unix
- obviously transient paths where relevant

### Step 5. Implement manifest rendering in one place
All platform writers should share one renderer.

Suggested shape:

```rust
pub fn render_manifest(sidecar_path: &Path, extension_ids: &[String]) -> anyhow::Result<String>
```

Recommended output behavior:
- pretty JSON for readability
- deterministic field order
- always absolute sidecar path

Possible output:

```json
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "/absolute/path/to/bridge-sidecar",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://stable-id/"
  ]
}
```

### Step 6. Build verify-then-write helpers
Do not mix file comparison logic into each platform implementation.

Suggested helpers:

```rust
pub fn read_existing(path: &Path) -> anyhow::Result<Option<String>>
pub fn needs_rewrite(path: &Path, desired: &str) -> anyhow::Result<bool>
pub fn write_if_changed(path: &Path, desired: &str) -> anyhow::Result<bool>
```

Rules:
- create parent directory if needed
- compare full normalized content
- write only if changed
- return whether a write happened

### Step 7. Implement per-platform browser target resolution
Each platform should produce a list of `BrowserTarget` values.

The targets should include:
- supported browser kind
- extension ID
- manifest file path
- optional registry key
- detection result

This keeps install logic generic.

## Pseudocode for the core flow

```rust
pub fn ensure_native_host_installed() -> anyhow::Result<NativeHostStatus> {
    let sidecar_path = resolve_sidecar_path()?;
    let targets = discover_browser_targets(&sidecar_path)?;
    let mut statuses = Vec::new();

    for target in targets {
        let manifest = render_manifest(&sidecar_path, &[target.extension_id.clone()])?;
        let status = install_or_verify_target(&target, &manifest)?;
        statuses.push(status);
    }

    Ok(NativeHostStatus { sidecar_path, browsers: statuses })
}
```

## Platform-specific execution notes

### Windows implementation notes
- Use native Rust registry APIs or a crate with a small dependency footprint.
- Write the manifest to a user-writable stable location.
- Set the `HKCU` default value to the manifest path.
- Consider writing separate manifests only if browser-specific `allowed_origins` differ.
- If one manifest can safely hold multiple Chromium IDs, that is cleaner than duplicating files.

### macOS implementation notes
- Detect browser directories conservatively.
- Create `NativeMessagingHosts` only when writing for a supported detected browser.
- Keep writes in the user domain, not system-wide.

### Linux implementation notes
- Prefer XDG-compatible stable destinations where possible.
- If packaging format does not guarantee a stable sidecar path, stage a copy into an app-managed location before generating manifests.

## Wiring into app startup

### Suggested `lib.rs` integration pattern

```rust
mod bridge_ws;
mod native_host;
mod win_foreground;

async fn setup(app: tauri::AppHandle) -> Result<(), String> {
    info!("[bridge-app] async setup starting");

    match native_host::ensure_native_host_installed() {
        Ok(status) => {
            info!("[bridge-app] native host setup ok: {:?}", status);
        }
        Err(err) => {
            error!("[bridge-app] native host setup failed: {err:#}");
        }
    }

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        info!("[bridge-app] main window restored");
    }

    info!("[bridge-app] async setup complete");
    Ok(())
}
```

### Design choice
Recommended startup policy:
- Log and continue when one browser target fails.
- Only return a hard error if the sidecar path cannot be resolved at all or a truly fatal invariant breaks.

## Concrete tasks by file

### New Rust files to add
- `packages/app-tauri/src-tauri/src/native_host/mod.rs`
- `packages/app-tauri/src-tauri/src/native_host/config.rs`
- `packages/app-tauri/src-tauri/src/native_host/types.rs`
- `packages/app-tauri/src-tauri/src/native_host/paths.rs`
- `packages/app-tauri/src-tauri/src/native_host/render.rs`
- `packages/app-tauri/src-tauri/src/native_host/install.rs`
- `packages/app-tauri/src-tauri/src/native_host/verify.rs`
- `packages/app-tauri/src-tauri/src/native_host/platform_windows.rs`
- `packages/app-tauri/src-tauri/src/native_host/platform_macos.rs`
- `packages/app-tauri/src-tauri/src/native_host/platform_linux.rs`

### Existing Rust file to modify
- `packages/app-tauri/src-tauri/src/lib.rs`

### Docs to update after code works
- `README.md`
- `packages/app-tauri/README.md`
- `packages/sidecar/README.md`
- `packages/sidecar/manifests/README.md`
- `docs/windows-dev-setup.md`

## Strong default decisions for the implementer
Unless told otherwise:
- Tier 1 browsers: Chrome, Edge, Brave, Comet
- Tier 2: Chromium
- Firefox deferred
- startup behavior: verify every launch, repair as needed
- no user prompt for extension IDs
- no runtime shelling out to current install scripts

## Suggested test slices during implementation

### Slice 1: Pure Rust helpers
Test:
- manifest render output
- path resolution helpers
- file rewrite detection

### Slice 2: Platform target resolution
Test:
- browser path calculation
- registry path calculation on Windows
- target filtering when browser roots do not exist

### Slice 3: End-to-end startup behavior
Test manually:
- delete manifest
- relaunch app
- verify manifest returns
- break registry on Windows
- relaunch app
- verify repair occurs

## Common failure modes to guard against
- Using a dev build sidecar path in production manifests
- Assuming Windows profile file placement alone is enough
- Treating “first run” as sufficient instead of every-launch verification
- Supporting Comet in prose but not implementing actual path targets
- Supporting Firefox implicitly without completing its native-host specifics
- Writing manifests before stable extension IDs are decided
- Using transient macOS or AppImage paths

## Finish line
Implementation should be considered ready for handoff to release validation when:
- the app self-installs native-host integration across the intended platforms
- relaunch is idempotent
- stale setup is repaired
- docs no longer tell real users to edit manifests manually

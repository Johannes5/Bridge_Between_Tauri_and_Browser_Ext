# Multi-Browser Support Implementation

## Overview

Successfully implemented support for **multiple simultaneous browser connections** in the Bridge app. The app can now connect to Chrome, Comet (Perplexity), Edge, Brave, and other Chromium-based browsers simultaneously, displaying tabs from each browser separately.

## What Changed

### 1. **Shared Proto Schemas** (`packages/shared-proto/src/schemas/`)

Added `connectionId` and `browser` metadata to key schemas:

- **`presence.ts`**: Added `connectionId` and `browser` to `PresenceStatusPayloadSchema`
- **`tabs.ts`**: Added `connectionId` and `browser` to:
  - `TabsListPayloadSchema`
  - `TabsOpenOrFocusPayloadSchema`
  - `TabsRestorePayloadSchema`

### 2. **Sidecar** (`packages/sidecar/src/main.rs`)

**Browser Detection:**
- Automatically detects the browser by inspecting parent process name (using Windows `wmic`)
- Detects: Chrome, Edge, Brave, Comet/Perplexity
- Falls back to "Unknown" if detection fails
- Can be overridden with `BRIDGE_BROWSER` environment variable

**Connection ID:**
- Generates unique connection ID per sidecar instance using timestamp + process ID
- Format: `{timestamp_hex}-{pid_hex}`

**Presence Messages:**
- Includes `connectionId` and `browser` in all presence.status messages
- Sent when connecting to the Tauri app

### 3. **Extension** (`packages/ext-plasmo/src/background.ts`)

- Extracts `connectionId` and `browser` from incoming presence messages
- Includes these in all outgoing `tabs.list` and `tabs.save` messages
- Logs connection establishment: `[bridge-ext] Connection established: Chrome (abc123-def456)`

### 4. **Tauri App - Rust** (`packages/app-tauri/src-tauri/src/bridge_ws.rs`)

Complete rewrite to support multiple simultaneous WebSocket connections:

**Architecture:**
- Maintains a `HashMap<ConnectionId, ConnectionMeta>` of all active connections
- Each connection has its own channel for bidirectional communication
- Automatically registers connections when presence messages arrive
- Cleans up connections on disconnect

**Message Routing:**
- If a message includes `connectionId` in payload → routes to that specific browser
- If no `connectionId` → broadcasts to ALL connected browsers
- Example: `tabs.restore` with connectionId opens tabs in that specific browser

**Connection Tracking:**
```rust
struct ConnectionMeta {
  id: ConnectionId,
  browser: Option<String>,
  sender: mpsc::Sender<String>,
}
```

### 5. **Tauri App - React UI** (`packages/app-tauri/src/index.tsx`)

**State Management:**
- Changed from single `tabsSnapshot` to `Map<connectionId, BrowserTabSnapshot>`
- Each browser connection tracked separately with:
  - `browser`: Browser name (Chrome, Comet, etc.)
  - `connectionId`: Unique connection ID
  - `payload`: Tab list payload
  - `lastUpdate`: Timestamp of last update

**UI Changes:**
- Shows **separate sections** for each browser:
  - "Current Window Tabs - Chrome"
  - "Current Window Tabs - Comet"
  - etc.
- Each section shows:
  - Browser name
  - Connection ID and last update time
  - "Save These Tabs" button (per browser)
  - Tab list with Focus buttons
- Saved collections now show browser name
- Restore buttons use the original browser if available, otherwise first available

**User Actions:**
- **Focus Tab**: Opens/focuses tab in the correct browser
- **Save These Tabs**: Saves tabs from specific browser
- **Restore**: Opens tabs in original browser (or default if unavailable)

## How It Works

### Connection Flow

```
1. Chrome Extension Starts
   ↓
2. Launches bridge-sidecar.exe (via Native Messaging)
   ↓
3. Sidecar detects "Chrome" from parent process
   ↓
4. Sidecar generates connectionId: "18d4f2a-3b9c"
   ↓
5. Sidecar connects to Tauri App (ws://127.0.0.1:17342)
   ↓
6. Sends: { type: "presence.status", payload: { sidecar: "online", connectionId: "18d4f2a-3b9c", browser: "Chrome" }}
   ↓
7. Tauri App registers connection in HashMap
   ↓
8. Extension receives presence, stores connectionId/browser
   ↓
9. Extension sends tabs.list with connectionId/browser
   ↓
10. Tauri App displays in "Current Window Tabs - Chrome"
```

**Simultaneously:**
- Comet launches its own sidecar → connectionId: "18d4f3e-4c2d"
- Both connections maintained in parallel
- Both browsers' tabs shown separately

### Message Routing

**Broadcast (no connectionId):**
```typescript
{ type: "tabs.list.request" }  // Sent to ALL browsers
```

**Targeted (with connectionId):**
```typescript
{
  type: "tabs.restore",
  payload: {
    urls: ["https://example.com"],
    connectionId: "18d4f2a-3b9c"  // Only sent to this connection
  }
}
```

## Testing

### Prerequisites

1. **Build sidecar:**
   ```powershell
   cd packages/sidecar
   cargo build --release
   ```

2. **Install for all browsers:**
   ```powershell
   cd manifests
   .\install-windows.ps1 -ExtensionId "anlnmjdkhinpnimhpeafdchenbhjdble" -Browser all
   ```

3. **Restart browsers:**
   - Close Chrome completely
   - Close Comet completely
   - Reopen both

### Test Procedure

1. **Start Tauri App:**
   ```powershell
   cd packages/app-tauri
   pnpm dev
   ```

2. **Open Chrome** → Extension auto-connects
   - You should see console log: `[bridge-ext] Connection established: Chrome (...)`
   - Check app: "Current Window Tabs - Chrome" section appears

3. **Open Comet** → Extension auto-connects
   - Console log: `[bridge-ext] Connection established: Comet (...)`
   - App now shows TWO sections:
     - "Current Window Tabs - Chrome"
     - "Current Window Tabs - Comet"

4. **Test Tab Focus:**
   - Click "Focus" on a Chrome tab → Should activate that tab in Chrome
   - Click "Focus" on a Comet tab → Should activate that tab in Comet

5. **Test Save:**
   - Click "Save These Tabs" in Chrome section → Saves Chrome tabs (labeled "Chrome")
   - Click "Save These Tabs" in Comet section → Saves Comet tabs (labeled "Comet")

6. **Test Restore:**
   - Click "Restore (eager)" on Chrome saved tabs → Opens in Chrome
   - Click "Restore (eager)" on Comet saved tabs → Opens in Comet
   - If original browser not available → Uses first available browser

### Expected Behavior

✅ Multiple browser sections appear simultaneously
✅ Each section updates independently
✅ Actions (Focus, Save, Restore) target correct browser
✅ Connection ID and browser name displayed
✅ Saved collections show which browser they came from

## Browser Detection Details

**Supported Browsers:**
- **Chrome**: Detected from `chrome.exe` parent process
- **Edge**: Detected from `msedge.exe` parent process
- **Brave**: Detected from `brave.exe` parent process
- **Comet/Perplexity**: Detected from `comet.exe` or any process containing "perplexity"

**Override Detection:**
Set environment variable before launching browser:
```powershell
$env:BRIDGE_BROWSER="MyCustomBrowser"
```

## Architecture Benefits

1. **Scalability**: Can handle unlimited browser connections
2. **Isolation**: Each browser's tabs managed independently
3. **Reliability**: One browser crashing doesn't affect others
4. **User Choice**: Can restore tabs to specific browsers
5. **Transparency**: Always know which browser you're interacting with

## Troubleshooting

### "No browser connections yet"
- Check browser console for `[bridge-ext] Connection established`
- Verify sidecar is registered: Check Windows Registry
- Check sidecar logs in terminal

### Tabs appear in wrong browser section
- Browser detection may have failed
- Check sidecar terminal output for detected browser name
- Override with `BRIDGE_BROWSER` environment variable

### Restore opens tabs in wrong browser
- If original browser is closed, uses first available
- Open target browser first, then restore

## Future Enhancements

Possible improvements:

1. **Default Browser Selection**: UI to choose which browser for restores
2. **Cross-Browser Actions**: Move tabs between browsers
3. **Connection Status Indicators**: Visual indication of connection health
4. **Browser Icons**: Show browser logos instead of text
5. **Per-Browser Settings**: Different configurations per browser
6. **Connection History**: Track connection/disconnection events

## Files Modified

- `packages/shared-proto/src/schemas/tabs.ts`
- `packages/shared-proto/src/schemas/presence.ts`
- `packages/sidecar/src/main.rs`
- `packages/ext-plasmo/src/background.ts`
- `packages/app-tauri/src-tauri/src/bridge_ws.rs`
- `packages/app-tauri/src/index.tsx`

## Summary

The app now fully supports multiple simultaneous browser connections! Each browser (Chrome, Comet, Edge, Brave, etc.) appears as a separate section in the UI, allowing you to:

- View tabs from all connected browsers simultaneously
- Focus/open tabs in the correct browser
- Save and restore tabs per browser
- See which browser each saved collection came from

All routing happens automatically based on `connectionId`, ensuring actions always target the correct browser.



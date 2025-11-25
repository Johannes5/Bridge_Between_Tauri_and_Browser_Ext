# How to Run the Bridge Project

This project consists of 3 main components that work together to enable Tauri app ↔ Browser communication:

1. **Tauri Desktop App** (React frontend + Rust backend)
2. **Rust Sidecar** (Native messaging host + WebSocket server)
3. **Browser Extension** (Manifest V3, connects to sidecar)

## Quick Start (Everything is already built!)

### 1. Start the Tauri Desktop App
```bash
pnpm dev:app
```
This will:
- Start the React development server
- Launch the Tauri desktop application
- Connect to the sidecar via WebSocket

### 2. Load the Browser Extension
The extension has been built to `packages/ext-plasmo/build/chrome-mv3-dev/`.

**Load in Chrome/Edge/Brave:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Navigate to: `packages/ext-plasmo/build/chrome-mv3-dev/`
5. Select the folder and click "Select Folder"

The extension will automatically connect to the sidecar once loaded.

### 3. Test the Functionality
1. Open multiple browser tabs
2. In the Tauri app, you should see all your browser tabs listed
3. Click on any tab in the Tauri app to focus that browser window and tab
4. The window focusing should work properly now!

## Manual Build Steps (if needed)

### Prerequisites
- Node.js (for pnpm and TypeScript)
- pnpm package manager
- Rust toolchain (with cargo)
- Tauri CLI

### Build Order
```bash
# 1. Install all dependencies
pnpm install

# 2. Build shared protocol schemas
pnpm build:proto

# 3. Build the Rust sidecar
cd packages/sidecar
cargo build
cd ../..

# 4. Build browser extension
pnpm build:ext

# 5. Start the Tauri app
pnpm dev:app
```

## Project Architecture

```
┌─────────────────┐    WebSocket     ┌──────────────────┐    Native Msg    ┌─────────────────┐
│   Tauri App     │ ◄─────────────► │   Rust Sidecar   │ ◄───────────────► │ Browser Extension│
│ (React + Rust)  │    Port 9876     │ (WebSocket Host) │   Chrome APIs     │  (Manifest V3)  │
└─────────────────┘                 └──────────────────┘                  └─────────────────┘
       ▲                                       │                                     │
       │                                       │                                     │
   User clicks                           Cross-platform                        Streams tab
   tab to focus                       window focusing APIs                     data in realtime
```

## Key Features

✅ **Real-time tab synchronization** - See all browser tabs in the desktop app
✅ **Cross-platform window focusing** - Works on Windows, Linux, and macOS
✅ **Multiple browser support** - Chrome, Edge, Brave, etc.
✅ **Advanced Windows focusing** - Uses Win32 APIs to overcome focus-stealing protection
✅ **Native messaging protocol** - Secure communication between extension and sidecar

## Troubleshooting

### Extension not connecting?
1. Check that the sidecar is running (should start automatically with Tauri app)
2. Verify the extension is loaded properly in `chrome://extensions/`
3. Check browser console for any errors

### Window focusing not working?
1. Make sure you're testing with multiple browser windows open
2. On Windows, the advanced focusing uses Win32 APIs which should work
3. On Linux, install `wmctrl` or `xdotool`: `sudo apt install wmctrl xdotool`
4. On macOS, AppleScript should work out of the box

### Build errors?
1. Make sure Rust is installed: `rustc --version`
2. Ensure cargo is in PATH: `cargo --version`
3. Verify pnpm is working: `pnpm --version`
4. Try `pnpm install` again if dependencies are missing

## Development Workflow

### Making changes to the extension:
```bash
pnpm dev:ext
# Then reload extension in chrome://extensions/
```

### Making changes to the Tauri app:
```bash
pnpm dev:app
# Hot reload should work automatically
```

### Making changes to the sidecar:
```bash
cd packages/sidecar
cargo build
# Restart the Tauri app to reload the sidecar
```

## Next Steps for Integration

This experimental project has successfully solved the window focusing bug. The next phase is integrating this functionality into the main mapmap.app project.

📋 **Integration resources prepared:**
- Complete transfer documentation: `docs/transfer/transfer_prompt.md`
- Full codebase payload: `docs/transfer/payload/`
- React components ready for integration
- Rust backend integration examples

The window focusing solution uses advanced cross-platform APIs and should work reliably in production.
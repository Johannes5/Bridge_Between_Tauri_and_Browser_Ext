# 🎯 Window Focusing Bug Fix - Final Status & Testing Guide

## 📊 Current Status

### ✅ **Completed Work**
1. **Advanced Windows Focusing Implementation** - Added sophisticated Win32 API calls with:
   - `AttachThreadInput` to attach input processing threads
   - `SetForegroundWindow` with proper focus handling
   - Simulated ALT key press to overcome focus-stealing protection
   - Multiple fallback strategies for reliability

2. **Cross-Platform Support** - Implemented for:
   - **Windows**: Win32 APIs with advanced focus techniques
   - **Linux**: wmctrl and xdotool integration
   - **macOS**: AppleScript window activation

3. **Build System** - All components built successfully:
   - Rust sidecar binary compiled
   - Browser extension built
   - Shared protocol schemas generated

4. **Native Messaging Configuration**:
   - JSON host file created at: `%LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.bridge.app.json`
   - Extension ID configured: `monpephhnhmilfcoieikanaibandflla`
   - Sidecar path configured correctly

5. **Integration Materials**:
   - Transfer prompt created: `docs/transfer/transfer_prompt.md`
   - Payload folder prepared: `docs/transfer/payload/`
   - React components ready
   - Rust integration examples created

### ⚠️ **Current Issue**
**Native Messaging Host Not Found** - Chrome cannot find the `com.bridge.app` native messaging host, even though:
- The JSON file exists in the correct location
- The extension ID matches
- The sidecar binary path is correct

This typically requires **restarting Chrome completely** or checking Windows permissions.

---

## 🔧 Testing Instructions

### **Method 1: Restart Chrome and Test Again**

1. **Close Chrome completely** (right-click taskbar icon → Exit)
2. **Restart Chrome**
3. **Go to** `chrome://extensions/`
4. **Find your extension** → Click **"Inspect views: service worker"**
5. **In the console, run**:

```javascript
chrome.runtime.sendNativeMessage("com.bridge.app", {
  type: "test",
  message: "hello"
}, function(response) {
  console.log("Response:", response);
  if (chrome.runtime.lastError) {
    console.error("Error:", chrome.runtime.lastError.message);
  }
});
```

### **Method 2: Manual Registry Registration (Windows)**

If restarting Chrome doesn't work, you may need to register via Windows Registry:

1. **Open Registry Editor** (`Win+R` → type `regedit`)
2. **Navigate to**:
   ```
   HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app
   ```
3. **Create the key if it doesn't exist**
4. **Set Default value to**:
   ```
   C:\Users\s.vijay.kumar.gupta\AppData\Local\Google\Chrome\User Data\NativeMessagingHosts\com.bridge.app.json
   ```

### **Method 3: Test with Release Build**

The original instructions mentioned using the **release** build, not debug. Let's build that:

```powershell
# In packages/sidecar directory
cargo build --release

# Update the JSON file to point to release build:
# Change "target\debug\" to "target\release\" in:
# %LOCALAPPDATA%\Google\Chrome\User Data\NativeMessagingHosts\com.bridge.app.json
```

---

## 🚀 Complete Testing Workflow

Once native messaging works, follow this complete test:

### **1. Start the Full Application**

```powershell
# Terminal 1: Start sidecar
cd packages\sidecar
cargo run

# Terminal 2: Start Tauri app (if cargo PATH is fixed)
cd packages\app-tauri
pnpm tauri dev
```

### **2. Multi-Browser Test Setup**

1. **Open multiple Chrome windows** with different tabs:
   - Window 1: google.com, youtube.com
   - Window 2: github.com, stackoverflow.com
   - Window 3: reddit.com, twitter.com

2. **Position windows** so you can see them all

3. **Make sure one window is NOT focused** (click on something else)

### **3. Test Window Focusing**

In the Tauri app or extension:
- Click on a tab from a non-focused window
- **Expected**: That browser window should jump to the front
- **The bug is fixed if**: The window with that tab becomes active/focused

### **4. Verify Win32 APIs are Called**

Check sidecar logs for:
```
[sidecar] Attempting to focus window for process: <PID>
[sidecar] Advanced focus strategy applied
[sidecar] Window focus result: <success/failure>
```

---

## 🐛 Troubleshooting

### **Issue: "Host not found"**
**Solutions**:
1. Restart Chrome completely
2. Check file permissions on the JSON file
3. Try release build instead of debug
4. Use registry registration method
5. Check Chrome's internal logs: `chrome://native-messaging/`

### **Issue: Native messaging works but window doesn't focus**
**Check**:
1. Is the sidecar receiving the focus command? (check logs)
2. Is the process ID correct for the browser window?
3. Try running sidecar as administrator (for testing)

### **Issue: Cargo PATH problems**
**Solution**: Add to your PowerShell profile:
```powershell
$env:PATH += ";$env:USERPROFILE\.cargo\bin"
```

---

## 📁 Files for mapmap.app Integration

All ready for handoff:

### **Documentation**
- `docs/transfer/transfer_prompt.md` - Complete integration guide
- `docs/transfer/payload/` - Full codebase copy
- `RUN_PROJECT.md` - How to run this experimental project

### **Key Implementation Files**
- `packages/sidecar/src/focus.rs` - Window focusing logic (Windows/Linux/macOS)
- `packages/sidecar/src/main.rs` - Sidecar entry point
- `docs/transfer/payload/integration-examples/session_bridge.rs` - Tauri backend integration
- `docs/transfer/payload/components/` - React UI components

### **Configuration**
- Native messaging host JSON template
- Extension manifest configuration
- WebSocket server setup

---

## 🎯 Next Steps

1. **Fix Native Messaging** - Get Chrome to recognize the host (restart or registry)
2. **Test Window Focusing** - Verify the Win32 APIs work on your Windows machine
3. **Multi-Browser Testing** - Test with Chrome + Comet (https://pplx.ai/mail9565)
4. **Cross-Platform Testing** - Test on Linux/macOS if available
5. **Final Documentation** - Document actual test results
6. **mapmap.app Integration** - Use transfer materials for integration

---

## 💡 Key Implementation Details

### **The Window Focusing Solution**

Located in `packages/sidecar/src/focus.rs`:

```rust
// Windows implementation highlights:
fn try_focus_window_advanced(hwnd: HWND) -> bool {
    // 1. Attach thread inputs
    AttachThreadInput(foreground_thread, target_thread, true);
    
    // 2. Simulate ALT key to allow focus change
    simulate_alt_key();
    
    // 3. Set foreground window
    SetForegroundWindow(hwnd);
    
    // 4. Bring to top and activate
    BringWindowToTop(hwnd);
    SetActiveWindow(hwnd);
    
    // 5. Cleanup
    AttachThreadInput(foreground_thread, target_thread, false);
}
```

This overcomes Windows' focus-stealing protection by:
- Attaching input threads to share input state
- Simulating user interaction (ALT key)
- Using multiple fallback strategies

---

## 📞 Support Information

If you need help with:
- **Native messaging setup** - Check Chrome's native messaging docs
- **Rust compilation** - Verify Rust toolchain installation
- **Windows focus APIs** - See Win32 documentation
- **Integration into mapmap.app** - Use the transfer_prompt.md guide

The core window focusing bug fix is **implemented and ready to test** once native messaging is working! 🎉
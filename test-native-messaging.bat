@echo off
echo.
echo ============================================
echo   NATIVE MESSAGING TEST GUIDE
echo ============================================
echo.
echo STEP 1: Make sure NO sidecar is running
echo         (to avoid infinite loops)
echo.
echo STEP 2: Restart Chrome completely
echo         - Close all Chrome windows
echo         - Right-click Chrome in taskbar
echo         - Click "Exit"
echo         - Wait 5 seconds
echo         - Open Chrome again
echo.
echo STEP 3: Go to chrome://extensions/
echo.
echo STEP 4: Find your "Bridge Dev Extension"
echo         Click on "service worker (Inactive)"
echo.
echo STEP 5: In the console that opens, paste:
echo.
echo chrome.runtime.sendNativeMessage('com.bridge.app', {type: 'test'}, function(r) {
echo   console.log('Response:', r);
echo   if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message);
echo });
echo.
echo STEP 6: Check the result:
echo.
echo   ✅ "Disconnected from native messaging host"
echo      = GOOD! Host was found but not running
echo.
echo   ❌ "Specified native messaging host not found"
echo      = BAD! Need to restart Chrome or fix config
echo.
echo ============================================
echo.
pause
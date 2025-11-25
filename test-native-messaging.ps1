# Simple Native Messaging Test Script
# This will help test the native messaging without infinite loops

Write-Host "🎯 Native Messaging Test Setup" -ForegroundColor Green
Write-Host ""

# Check if sidecar exists
$sidecarPath = "C:\Users\s.vijay.kumar.gupta\OneDrive - Accenture\Desktop\Bridge_Between_Tauri_and_Browser_Ext\packages\sidecar\target\debug\bridge-sidecar.exe"

if (Test-Path $sidecarPath) {
    Write-Host "✅ Sidecar binary found" -ForegroundColor Green
} else {
    Write-Host "❌ Sidecar binary NOT found at: $sidecarPath" -ForegroundColor Red
    exit 1
}

# Check native messaging JSON
$jsonPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\NativeMessagingHosts\com.bridge.app.json"

if (Test-Path $jsonPath) {
    Write-Host "✅ Native messaging JSON found" -ForegroundColor Green
    Write-Host "   Path: $jsonPath" -ForegroundColor Gray
} else {
    Write-Host "❌ Native messaging JSON NOT found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Testing Instructions:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. The sidecar is NOT running (to avoid infinite loops)"
Write-Host "2. Go to Chrome: chrome://extensions/"
Write-Host "3. Click on 'service worker (Inactive)' for your extension"
Write-Host "4. In the console that opens, paste this:"
Write-Host ""
$jsCode = @"
chrome.runtime.sendNativeMessage('com.bridge.app', {type: 'test'}, (r) => {
  console.log('Response:', r);
  if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message);
});
"@
Write-Host $jsCode -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Press Enter and check for errors"
Write-Host ""
Write-Host "Expected Results:" -ForegroundColor Yellow
Write-Host "  ✅ If it says 'Disconnected from native messaging host' = HOST FOUND! (Good!)"
Write-Host "  ❌ If it says 'Specified native messaging host not found' = Need to restart Chrome"
Write-Host ""
Write-Host "If host is found, we can then test with sidecar running!" -ForegroundColor Green
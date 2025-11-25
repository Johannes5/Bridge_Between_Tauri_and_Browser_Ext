# Register Native Messaging Host in Windows Registry
# This is required for Chrome to find the native messaging host

$hostName = "com.bridge.app"
$jsonPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\NativeMessagingHosts\$hostName.json"

Write-Host "🔧 Registering Native Messaging Host in Windows Registry" -ForegroundColor Cyan
Write-Host ""

# Check if JSON file exists
if (!(Test-Path $jsonPath)) {
    Write-Host "❌ JSON file not found at: $jsonPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ JSON file found: $jsonPath" -ForegroundColor Green

# Create registry key for Chrome
$chromePath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"

try {
    # Create the key if it doesn't exist
    if (!(Test-Path $chromePath)) {
        New-Item -Path $chromePath -Force | Out-Null
        Write-Host "✅ Created registry key: $chromePath" -ForegroundColor Green
    } else {
        Write-Host "✅ Registry key already exists: $chromePath" -ForegroundColor Green
    }
    
    # Set the default value to point to the JSON file
    Set-ItemProperty -Path $chromePath -Name "(Default)" -Value $jsonPath
    Write-Host "✅ Set registry value to: $jsonPath" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "🎉 Registration complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Close Chrome completely (Exit from taskbar)"
    Write-Host "2. Wait 5 seconds"
    Write-Host "3. Restart Chrome"
    Write-Host "4. The native messaging host should now be found!"
    Write-Host ""
}
catch {
    Write-Host "❌ Error registering: $_" -ForegroundColor Red
    exit 1
}

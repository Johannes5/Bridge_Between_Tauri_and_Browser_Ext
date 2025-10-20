# Uninstall Native Messaging Host for Windows
# This script removes the native messaging host from the Windows Registry

param(
    [string]$Browser = "all" # chrome, edge, brave, or all
)

$ErrorActionPreference = "Stop"

Write-Host "Bridge Native Messaging Host Uninstaller for Windows" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Function to unregister from registry
function Unregister-NativeMessagingHost {
    param(
        [string]$BrowserName,
        [string]$RegistryPath
    )
    
    try {
        if (Test-Path $RegistryPath) {
            Remove-Item -Path $RegistryPath -Force -Recurse
            Write-Host "✓ Unregistered from $BrowserName" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "○ Not registered for $BrowserName" -ForegroundColor Gray
            return $false
        }
    }
    catch {
        Write-Host "✗ Failed to unregister from $BrowserName : $_" -ForegroundColor Yellow
        return $false
    }
}

# Registry paths for different browsers
$registryPaths = @{
    chrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app"
    edge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bridge.app"
    brave = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.bridge.app"
}

Write-Host "Unregistering native messaging host..." -ForegroundColor Cyan

$unregistered = $false

if ($Browser -eq "all") {
    foreach ($browserName in $registryPaths.Keys) {
        if (Unregister-NativeMessagingHost -BrowserName $browserName -RegistryPath $registryPaths[$browserName]) {
            $unregistered = $true
        }
    }
}
elseif ($registryPaths.ContainsKey($Browser)) {
    $unregistered = Unregister-NativeMessagingHost -BrowserName $Browser -RegistryPath $registryPaths[$Browser]
}
else {
    Write-Host "ERROR: Unknown browser '$Browser'. Use: chrome, edge, brave, or all" -ForegroundColor Red
    exit 1
}

Write-Host ""
if ($unregistered) {
    Write-Host "Uninstallation complete!" -ForegroundColor Green
}
else {
    Write-Host "Nothing to uninstall." -ForegroundColor Gray
}


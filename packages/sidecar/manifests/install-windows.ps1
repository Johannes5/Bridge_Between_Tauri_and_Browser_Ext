# Install Native Messaging Host for Windows
# This script registers the native messaging host in the Windows Registry

param(
    [string]$ExtensionId = "anlnmjdkhinpnimhpeafdchenbhjdble",
    [string]$Browser = "chrome" # chrome, edge, brave, or all
)

$ErrorActionPreference = "Stop"

# Paths
$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$SidecarExePath = Join-Path $WorkspaceRoot "packages\sidecar\target\release\bridge-sidecar.exe"
$ManifestDir = Join-Path $WorkspaceRoot "packages\sidecar\manifests"
$ManifestPath = Join-Path $ManifestDir "com.bridge.app.json"

Write-Host "Bridge Native Messaging Host Installer for Windows" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check if sidecar executable exists
if (-not (Test-Path $SidecarExePath)) {
    Write-Host "ERROR: Sidecar executable not found at: $SidecarExePath" -ForegroundColor Red
    Write-Host "Please build the sidecar first with: cargo build --release" -ForegroundColor Yellow
    exit 1
}

Write-Host "Sidecar executable found: $SidecarExePath" -ForegroundColor Green

# Generate manifest file
$manifest = @{
    name = "com.bridge.app"
    description = "Bridge between extension and Tauri app"
    path = $SidecarExePath
    type = "stdio"
    allowed_origins = @(
        "chrome-extension://$ExtensionId/"
    )
} | ConvertTo-Json -Depth 10

# Save manifest
$manifest | Out-File -FilePath $ManifestPath -Encoding utf8 -NoNewline
Write-Host "Manifest generated: $ManifestPath" -ForegroundColor Green

# Function to register in registry
function Register-NativeMessagingHost {
    param(
        [string]$BrowserName,
        [string]$RegistryPath
    )
    
    try {
        # Create registry key if it does not exist
        if (-not (Test-Path $RegistryPath)) {
            New-Item -Path $RegistryPath -Force | Out-Null
        }
        
        # Set default value to manifest path
        Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $ManifestPath
        
        Write-Host "Registered for $BrowserName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Failed to register for $BrowserName : $_" -ForegroundColor Yellow
        return $false
    }
}

# Registry paths for different browsers
$registryPaths = @{
    chrome = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bridge.app"
    edge = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bridge.app"
    brave = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.bridge.app"
}

Write-Host ""
Write-Host "Registering native messaging host..." -ForegroundColor Cyan

$registered = $false

if ($Browser -eq "all") {
    foreach ($browserName in $registryPaths.Keys) {
        if (Register-NativeMessagingHost -BrowserName $browserName -RegistryPath $registryPaths[$browserName]) {
            $registered = $true
        }
    }
}
elseif ($registryPaths.ContainsKey($Browser)) {
    $registered = Register-NativeMessagingHost -BrowserName $Browser -RegistryPath $registryPaths[$Browser]
}
else {
    Write-Host "ERROR: Unknown browser. Use: chrome, edge, brave, or all" -ForegroundColor Red
    exit 1
}

Write-Host ""
if ($registered) {
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Extension ID: $ExtensionId" -ForegroundColor Cyan
    Write-Host "Manifest: $ManifestPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your browser" -ForegroundColor Yellow
    Write-Host "2. Reload the extension" -ForegroundColor Yellow
    Write-Host "3. Check browser console for connection status" -ForegroundColor Yellow
}
else {
    Write-Host "Installation failed!" -ForegroundColor Red
    exit 1
}

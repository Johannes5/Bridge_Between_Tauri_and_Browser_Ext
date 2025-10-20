# Generate manifest files from templates
param(
    [string]$SideCarPath = "C:\Users\Johannes\Documents\Programming\bridge workspace\packages\sidecar\target\release\bridge-sidecar.exe",
    [string]$ChromeExtensionId = "your-chrome-extension-id",
    [string]$EdgeExtensionId = "your-edge-extension-id", 
    [string]$BraveExtensionId = "your-brave-extension-id",
    [string]$FirefoxExtensionId = "your-firefox-extension-id"
)

# Generate Chromium manifest
$chromiumTemplate = Get-Content "chromium.json.tpl" -Raw
$chromiumManifest = $chromiumTemplate -replace "{{SIDE_CAR_PATH}}", $SideCarPath.Replace("\", "\\")
$chromiumManifest = $chromiumManifest -replace "{{CHROME_EXTENSION_ID}}", $ChromeExtensionId
$chromiumManifest = $chromiumManifest -replace "{{EDGE_EXTENSION_ID}}", $EdgeExtensionId
$chromiumManifest = $chromiumManifest -replace "{{BRAVE_EXTENSION_ID}}", $BraveExtensionId
$chromiumManifest | Out-File "chromium.json" -Encoding utf8 -NoNewline

# Generate Firefox manifest
$firefoxTemplate = Get-Content "firefox.json.tpl" -Raw
$firefoxManifest = $firefoxTemplate -replace "{{SIDE_CAR_PATH}}", $SideCarPath.Replace("\", "\\")
$firefoxManifest = $firefoxManifest -replace "{{FIREFOX_EXTENSION_ID}}", $FirefoxExtensionId
$firefoxManifest | Out-File "firefox.json" -Encoding utf8 -NoNewline

Write-Host "Generated manifest files:"
Write-Host "- chromium.json (for Chrome, Edge, Brave)"
Write-Host "- firefox.json (for Firefox)"
Write-Host ""
Write-Host "Binary path: $SideCarPath"
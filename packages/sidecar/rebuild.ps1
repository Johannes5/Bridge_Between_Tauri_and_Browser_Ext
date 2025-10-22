# Quick rebuild script for sidecar
# Handles file locks gracefully

Write-Host "=== Bridge Sidecar Rebuild ===" -ForegroundColor Cyan
Write-Host ""

# Close browsers
Write-Host "Closing browsers..." -ForegroundColor Yellow
Stop-Process -Name "chrome","msedge","brave","comet" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Rename old executable if it exists
$oldExe = "target\release\bridge-sidecar.exe"
if (Test-Path $oldExe) {
    try {
        Move-Item -Path $oldExe -Destination "$oldExe.old" -Force -ErrorAction Stop
        Write-Host "Renamed old executable" -ForegroundColor Green
    }
    catch {
        Write-Host "Warning: Could not rename old executable" -ForegroundColor Yellow
    }
}

# Build
Write-Host ""
Write-Host "Building..." -ForegroundColor Yellow
cargo build --release

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    
    # Clean up old file
    if (Test-Path "$oldExe.old") {
        Remove-Item "$oldExe.old" -Force -ErrorAction SilentlyContinue
    }
    
    # Copy with target triple name for Tauri bundling
    Write-Host "Creating target-triple named copy for Tauri..." -ForegroundColor Yellow
    Copy-Item "target\release\bridge-sidecar.exe" -Destination "target\release\bridge-sidecar-x86_64-pc-windows-msvc.exe" -Force
    Write-Host "Created bridge-sidecar-x86_64-pc-windows-msvc.exe" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "You can now restart your browsers and the Tauri app." -ForegroundColor Cyan
}
else {
    Write-Host ""
    Write-Host "Build failed!" -ForegroundColor Red
}


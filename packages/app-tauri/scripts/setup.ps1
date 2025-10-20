# Setup script for MapMap Test App (PowerShell)
# This script helps set up the development environment on Windows

$ErrorActionPreference = "Stop"

Write-Host "🚀 Setting up MapMap Test App..." -ForegroundColor Cyan

# Check for required tools
Write-Host "`nChecking for required tools..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm found: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  pnpm not found. Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm installed: $pnpmVersion" -ForegroundColor Green
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust not found. Please install Rust first:" -ForegroundColor Red
    Write-Host "   Download from: https://rustup.rs/" -ForegroundColor Yellow
    Write-Host "   Or run: winget install Rustlang.Rustup" -ForegroundColor Yellow
    exit 1
}

# Check Cargo
try {
    $cargoVersion = cargo --version
    Write-Host "✅ Cargo found: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Cargo not found. Please install Rust first." -ForegroundColor Red
    exit 1
}

# Install Node dependencies
Write-Host "`n📦 Installing Node dependencies..." -ForegroundColor Yellow
pnpm install

# Check Rust dependencies
Write-Host "`n🦀 Checking Rust dependencies..." -ForegroundColor Yellow
Set-Location src-tauri
cargo check
Set-Location ..

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nTo start development:" -ForegroundColor Cyan
Write-Host "  pnpm tauri:dev" -ForegroundColor White
Write-Host "`nTo build for production:" -ForegroundColor Cyan
Write-Host "  pnpm tauri:build" -ForegroundColor White
Write-Host "`nFor more information, see:" -ForegroundColor Cyan
Write-Host "  - README.md for full documentation" -ForegroundColor White
Write-Host "  - QUICK_START.md for a quick tutorial" -ForegroundColor White
Write-Host "  - EXAMPLES.md for code examples" -ForegroundColor White


#!/bin/bash

# Setup script for MapMap Test App
# This script helps set up the development environment

set -e

echo "🚀 Setting up MapMap Test App..."

# Check for required tools
echo "Checking for required tools..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi
echo "✅ Node.js found: $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm not found. Installing pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm found: $(pnpm --version)"

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust not found. Please install Rust first:"
    echo "   https://www.rust-lang.org/tools/install"
    exit 1
fi
echo "✅ Rust found: $(rustc --version)"

# Check Cargo
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo not found. Please install Rust first."
    exit 1
fi
echo "✅ Cargo found: $(cargo --version)"

# Install Node dependencies
echo ""
echo "📦 Installing Node dependencies..."
pnpm install

# Check Rust dependencies
echo ""
echo "🦀 Checking Rust dependencies..."
cd src-tauri
cargo check
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  pnpm tauri:dev"
echo ""
echo "To build for production:"
echo "  pnpm tauri:build"
echo ""
echo "For more information, see:"
echo "  - README.md for full documentation"
echo "  - QUICK_START.md for a quick tutorial"
echo "  - EXAMPLES.md for code examples"


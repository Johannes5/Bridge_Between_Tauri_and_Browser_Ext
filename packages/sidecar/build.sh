#!/bin/bash
set -e

# Detect architecture and OS
OS=$(uname -s)
ARCH=$(uname -m)

if [ "$OS" == "Darwin" ]; then
    if [ "$ARCH" == "arm64" ]; then
        TARGET="aarch64-apple-darwin"
    else
        TARGET="x86_64-apple-darwin"
    fi
elif [ "$OS" == "Linux" ]; then
    TARGET="x86_64-unknown-linux-gnu"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

echo "Detected OS: $OS"
echo "Detected architecture: $ARCH"
echo "Target triple: $TARGET"

# Build
echo "Building sidecar..."
cargo build --release

# Rename for Tauri
echo "Renaming binary for Tauri..."
cp "target/release/bridge-sidecar" "target/release/bridge-sidecar-$TARGET"

echo "Build complete: target/release/bridge-sidecar-$TARGET"

#!/bin/bash
set -e

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" == "arm64" ]; then
    TARGET="aarch64-apple-darwin"
else
    TARGET="x86_64-apple-darwin"
fi

echo "Detected architecture: $ARCH"
echo "Target triple: $TARGET"

# Build
echo "Building sidecar..."
cargo build --release

# Rename for Tauri
echo "Renaming binary for Tauri..."
cp "target/release/bridge-sidecar" "target/release/bridge-sidecar-$TARGET"

echo "Build complete: target/release/bridge-sidecar-$TARGET"

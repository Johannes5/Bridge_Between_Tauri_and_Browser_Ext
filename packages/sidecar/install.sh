#!/bin/bash
set -e

EXTENSION_ID=$1

if [ -z "$EXTENSION_ID" ]; then
    echo "Usage: ./install.sh <extension-id>"
    echo "Example: ./install.sh mhfcnglaipimjmhifeejefmimoeehkak"
    exit 1
fi

# Detect OS
OS=$(uname -s)
ARCH=$(uname -m)

echo "Detected OS: $OS"

# 1. Build the sidecar
./build.sh

# 2. Determine target paths
if [ "$OS" == "Darwin" ]; then
    TARGET_BINARY="target/release/bridge-sidecar-x86_64-apple-darwin"
    if [ "$ARCH" == "arm64" ]; then
        TARGET_BINARY="target/release/bridge-sidecar-aarch64-apple-darwin"
    fi
    
    # Chrome, Edge, Brave, etc. locations on macOS
    CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    EDGE_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
    BRAVE_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
    
elif [ "$OS" == "Linux" ]; then
    TARGET_BINARY="target/release/bridge-sidecar-x86_64-unknown-linux-gnu"
    
    # Linux locations
    CHROME_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_DIR="$HOME/.config/chromium/NativeMessagingHosts"
    EDGE_DIR="$HOME/.config/microsoft-edge/NativeMessagingHosts"
    BRAVE_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
else
    echo "Unsupported OS: $OS"
    exit 1
fi

ABS_PATH_TO_BINARY="$(pwd)/$TARGET_BINARY"

if [ ! -f "$ABS_PATH_TO_BINARY" ]; then
    echo "Error: Binary not found at $ABS_PATH_TO_BINARY"
    echo "Build might have failed or binary name is different."
    exit 1
fi

echo "Binary path: $ABS_PATH_TO_BINARY"

# 3. Create Manifest Content
MANIFEST_CONTENT=$(cat <<EOF
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "$ABS_PATH_TO_BINARY",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
)

# 4. Install Manifest
install_manifest() {
    DIR=$1
    NAME=$2
    if [ -d "$(dirname "$DIR")" ]; then
        mkdir -p "$DIR"
        echo "$MANIFEST_CONTENT" > "$DIR/com.bridge.app.json"
        echo "Installed manifest to $DIR/com.bridge.app.json ($NAME)"
    else
        echo "Skipping $NAME (directory not found)"
    fi
}

echo "Installing manifests..."
install_manifest "$CHROME_DIR" "Google Chrome"
install_manifest "$CHROMIUM_DIR" "Chromium"
install_manifest "$EDGE_DIR" "Microsoft Edge"
install_manifest "$BRAVE_DIR" "Brave Browser"

echo ""
echo "Installation complete!"
echo "Please restart your browser."

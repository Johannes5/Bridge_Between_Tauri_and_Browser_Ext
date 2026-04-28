#!/bin/bash
set -e

EXTENSION_ID=${1:-"anlnmjdkhinpnimhpeafdchenbhjdble"}
BROWSER=${2:-"all"}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Navigate 3 levels up from manifests/ to root
WORKSPACE_ROOT="$( cd "$SCRIPT_DIR/../../.." &> /dev/null && pwd )"
SIDECAR_PATH="$WORKSPACE_ROOT/packages/sidecar/target/release/bridge-sidecar"
MANIFEST_PATH="$SCRIPT_DIR/com.bridge.app.json"

echo "Bridge Native Messaging Host Installer for macOS"
echo "==============================================="
echo ""

if [ ! -f "$SIDECAR_PATH" ]; then
    echo "ERROR: Sidecar executable not found at: $SIDECAR_PATH"
    echo "Please build the sidecar first with: ./build.sh (in packages/sidecar)"
    exit 1
fi

echo "Sidecar executable found: $SIDECAR_PATH"

# Generate manifest
echo "Generating manifest..."
cat > "$MANIFEST_PATH" <<EOF
{
  "name": "com.bridge.app",
  "description": "Bridge between extension and Tauri app",
  "path": "$SIDECAR_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

echo "Manifest generated at $MANIFEST_PATH"

# Function to install
install_manifest() {
    local TARGET_DIR="$1"
    local BROWSER_NAME="$2"
    
    if [ ! -d "$TARGET_DIR" ]; then
        echo "Creating directory for $BROWSER_NAME..."
        mkdir -p "$TARGET_DIR"
    fi
    
    cp "$MANIFEST_PATH" "$TARGET_DIR/"
    echo "Installed for $BROWSER_NAME at $TARGET_DIR"
}

CHROME_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
EDGE_DIR="$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
BRAVE_DIR="$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
CHROMIUM_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"

if [ "$BROWSER" == "all" ] || [ "$BROWSER" == "chrome" ]; then
    install_manifest "$CHROME_DIR" "Google Chrome"
fi

if [ "$BROWSER" == "all" ] || [ "$BROWSER" == "edge" ]; then
    install_manifest "$EDGE_DIR" "Microsoft Edge"
fi

if [ "$BROWSER" == "all" ] || [ "$BROWSER" == "brave" ]; then
    install_manifest "$BRAVE_DIR" "Brave"
fi

if [ "$BROWSER" == "all" ] || [ "$BROWSER" == "chromium" ]; then
    install_manifest "$CHROMIUM_DIR" "Chromium"
fi

echo ""
echo "Installation complete!"
echo "Extension ID: $EXTENSION_ID"
echo "Restart your browser to take effect."

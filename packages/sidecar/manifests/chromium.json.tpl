{
  "name": "com.bridge.app",
  "description": "Bridge between MapMap desktop app and extension",
  "path": "{{SIDE_CAR_PATH}}",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://{{CHROME_EXTENSION_ID}}/",
    "chrome-extension://{{EDGE_EXTENSION_ID}}/",
    "chrome-extension://{{BRAVE_EXTENSION_ID}}/"
  ]
}

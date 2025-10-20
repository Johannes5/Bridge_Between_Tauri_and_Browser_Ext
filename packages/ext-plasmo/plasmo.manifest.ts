const manifest = {
  manifest_version: 3,
  name: "Bridge Dev Extension",
  version: "0.1.0",
  description: "Companion extension for the MapMap bridge workspace.",
  background: {
    service_worker: "background.ts"
  },
  options_ui: {
    page: "options.html",
    open_in_tab: true
  },
  permissions: ["tabs", "sessions", "nativeMessaging", "windows"],
  host_permissions: ["http://*/*", "https://*/*"]
} satisfies chrome.runtime.ManifestV3;

export default manifest;

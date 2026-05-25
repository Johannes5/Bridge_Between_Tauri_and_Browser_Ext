import type { WindowInfo } from "shared-proto";

class GlobalState {
  private static instance: GlobalState;

  public nativePort: chrome.runtime.Port | null = null;
  public connectionId: string | null = null;
  public browser: string | null = null;
  public isConnectionReady = false;
  public windowInfoCache = new Map<number, WindowInfo>();
  public reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  private constructor() {
    this.connectionId = this.generateId();
    // initial detection, detected again on sidecar with process name for accuracy
    this.browser = this.detectBrowser();
  }

  private generateId(): string {
     // Simple random ID
     return `ext-${Math.random().toString(36).substring(2, 10)}`;
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent.toLowerCase()
    if (chrome.edge != undefined || ua.includes("edg/")) return "Edge";
    if (ua.includes("opr/") || ua.includes("opera/")) return "Opera";
    if ("brave" in navigator || ua.includes("brave")) return "Brave"; // Brave hides this often, but sometimes present
    if (chrome.perplexity != undefined || ua.includes("comet") || ua.includes("perplexity")) return "Comet";
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("chrome")) return "Chrome";
    return "Unknown";
  }

  public static getInstance(): GlobalState {
    if (!GlobalState.instance) {
      GlobalState.instance = new GlobalState();
    }
    return GlobalState.instance;
  }
}

export const state = GlobalState.getInstance();

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
    // Browsers with reliable API markers — checked first
    if (chrome.edge != undefined || ua.includes("edg/")) return "Edge";
    if ("brave" in navigator) return "Brave";
    if (chrome.perplexity != undefined) return "Comet";
    // Browsers with unique UA strings — checked before generic Chrome fallback
    if (ua.includes("opr/") || ua.includes("opera/")) return "Opera";
    if (ua.includes("vivaldi")) return "Vivaldi";
    if (ua.includes("yabrowser")) return "Yandex";
    if (ua.includes("whale")) return "Whale";
    if (ua.includes("comet") || ua.includes("perplexity")) return "Comet";
    if (ua.includes("brave")) return "Brave"; // fallback: Brave sometimes hides navigator.brave
    if (ua.includes("firefox")) return "Firefox";
    if (ua.includes("chrome")) return "Chrome"; // catches remaining Chromium browsers
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

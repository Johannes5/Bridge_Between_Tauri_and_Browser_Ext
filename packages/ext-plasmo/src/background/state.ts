import type { WindowInfo } from "@bridge/shared-proto";

class GlobalState {
  private static instance: GlobalState;
  
  public nativePort: chrome.runtime.Port | null = null;
  public connectionId: string | null = null;
  public browser: string | null = null;
  public isConnectionReady = false;
  public windowInfoCache = new Map<number, WindowInfo>();
  public reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  private constructor() {}

  public static getInstance(): GlobalState {
    if (!GlobalState.instance) {
      GlobalState.instance = new GlobalState();
    }
    return GlobalState.instance;
  }
}

export const state = GlobalState.getInstance();

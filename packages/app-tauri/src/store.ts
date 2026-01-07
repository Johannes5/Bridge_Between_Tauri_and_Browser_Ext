import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  EnvelopeSchema,
  PresenceStatusPayloadSchema,
  TabsListPayloadSchema,
  TabsSavedPayloadSchema,
  type Envelope,
  type TabsListPayload
} from "@bridge/shared-proto";
import type { 
  PresenceState, 
  LogEntry, 
  SavedTabCollection, 
  BrowserTabSnapshot 
} from "./types";

const SAVED_TABS_KEY = "bridge:saved-tab-collections";

interface BridgeState {
  // State
  browserTabs: Map<string, BrowserTabSnapshot>;
  presence: PresenceState;
  logEntries: LogEntry[];
  savedCollections: SavedTabCollection[];
  isSending: boolean;
  error: string | null;

  // Actions
  pushLog: (entry: LogEntry) => void;
  setPresence: (presence: Partial<PresenceState>) => void;
  updateBrowserSnapshot: (connectionId: string, browser: string, payload: TabsListPayload) => void;
  removeConnection: (connectionId: string) => void;
  
  // Saved Collections Actions
  loadSavedCollections: () => void;
  addSavedCollection: (entry: SavedTabCollection) => void;
  removeSavedCollection: (id: string) => void;
  clearSavedCollections: () => void;

  // Bridge Actions
  sendEnvelope: (envelope: Envelope) => Promise<void>;
  setIsSending: (sending: boolean) => void;
  
  // Initialization
  startListening: () => Promise<() => void>;
}

export const useBridgeStore = create<BridgeState>((set, get) => ({
  browserTabs: new Map(),
  presence: { app: "online" },
  logEntries: [],
  savedCollections: [],
  isSending: false,
  error: null,

  pushLog: (entry) => set((state) => ({ 
    logEntries: [entry, ...state.logEntries].slice(0, 50) 
  })),

  setPresence: (update) => set((state) => ({
    presence: { ...state.presence, ...update }
  })),

  updateBrowserSnapshot: (connectionId, browser, payload) => set((state) => {
    const updated = new Map(state.browserTabs);
    updated.set(connectionId, {
      browser,
      connectionId,
      payload,
      lastUpdate: Date.now()
    });
    return { browserTabs: updated };
  }),

  removeConnection: (connectionId) => set((state) => {
    const updated = new Map(state.browserTabs);
    updated.delete(connectionId);
    return { browserTabs: updated };
  }),

  loadSavedCollections: () => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(SAVED_TABS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedTabCollection[];
        if (Array.isArray(parsed)) {
          const validated = parsed.map((entry) => ({
            ...entry,
            tabs: Array.isArray(entry.tabs) ? entry.tabs : []
          }));
          set({ savedCollections: validated });
        }
      }
    } catch (err) {
      console.error("[bridge-store] failed to load saved tabs", err);
    }
  },

  addSavedCollection: (entry) => {
    set((state) => {
      const updated = [entry, ...state.savedCollections].slice(0, 25);
      // Persist side-effect
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SAVED_TABS_KEY, JSON.stringify(updated));
      }
      return { savedCollections: updated };
    });
    get().pushLog({
      at: Date.now(),
      type: "tabs.save",
      summary: `saved ${entry.tabs.length} tabs`
    });
  },

  removeSavedCollection: (id) => {
    set((state) => {
      const removed = state.savedCollections.find(c => c.id === id);
      const updated = state.savedCollections.filter(c => c.id !== id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SAVED_TABS_KEY, JSON.stringify(updated));
      }
      if (removed) {
        // We can't call pushLog here easily because of the set closure if we want to retain 'state' 
        // strictly pure, but we can access it via get() outside set, or just duplicate logic.
        // Actually, set() merges state. Let's trigger log after update.
        return { savedCollections: updated };
      }
      return {};
    });
    get().pushLog({
      at: Date.now(),
      type: "tabs.save.remove",
      summary: `removed collection ${id}`
    });
  },

  clearSavedCollections: () => {
    set({ savedCollections: [] });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SAVED_TABS_KEY);
    }
    get().pushLog({
      at: Date.now(),
      type: "tabs.save.clear",
      summary: "cleared saved collections"
    });
  },

  setIsSending: (sending) => set({ isSending: sending }),

  sendEnvelope: async (envelope) => {
    set({ isSending: true, error: null });
    get().pushLog({ at: Date.now(), type: envelope.type, summary: "sent" });
    
    try {
      await invoke("bridge_send", { envelope });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      get().pushLog({ at: Date.now(), type: "error", summary: message });
    } finally {
      set({ isSending: false });
    }
  },

  startListening: async () => {
    const unlisten = await listen<string>("bridge://incoming", (event) => {
      const raw = event.payload;
      const { pushLog, setPresence, updateBrowserSnapshot, removeConnection, addSavedCollection } = get();
      
      try {
        const envelope = EnvelopeSchema.parse(JSON.parse(raw));
        pushLog({
          at: Date.now(),
          type: envelope.type,
          summary: envelope.id ? `id=${envelope.id}` : "received"
        });

        switch (envelope.type) {
          case "tabs.list": {
            const payload = TabsListPayloadSchema.parse(envelope.payload);
            const connectionId = payload.connectionId;
            const browser = payload.browser;
            if (connectionId && browser) {
              updateBrowserSnapshot(connectionId, browser, payload);
            }
            break;
          }
          case "tabs.save": {
            const payload = TabsSavedPayloadSchema.parse(envelope.payload);
            // We need to convert payload to SavedTabCollection
            const entry: SavedTabCollection = {
               id: `${Date.now()}-${Math.random()}`,
               savedAt: payload.savedAt ?? Date.now(),
               windowId: payload.windowId,
               source: payload.source,
               label: payload.label,
               tabs: payload.tabs,
               browser: payload.browser,
               connectionId: payload.connectionId
            };
             // Ensure ID exists
             if (!entry.id) entry.id = `${Math.random().toString(36).slice(2)}`;
             
             addSavedCollection(entry);
            break;
          }
          case "presence.status": {
            const payload = PresenceStatusPayloadSchema.parse(envelope.payload ?? {});
            setPresence({
              app: payload.app,
              extension: payload.extension,
              sidecar: payload.sidecar,
              timestamp: payload.timestamp ?? Date.now()
            });
            
            if (payload.sidecar === "offline" && payload.connectionId) {
              removeConnection(payload.connectionId);
            }
            break;
          }
          case "error": {
            const message = envelope.payload && typeof envelope.payload === "object"
                ? (envelope.payload as Record<string, unknown>).error
                : undefined;
             set({ error: typeof message === "string" ? message : "Bridge reported an unknown error" });
            break;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[bridge-store] failed to parse envelope", message, raw);
        pushLog({ at: Date.now(), type: "parse-error", summary: message });
      }
    });

    return unlisten;
  }
}));

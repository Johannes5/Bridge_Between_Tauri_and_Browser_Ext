import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  EnvelopeSchema,
  PresenceStatusPayloadSchema,
  TabsListPayloadSchema,
  TabsSavedPayloadSchema,
  TabsDeltaPayloadSchema,
  type Envelope,
  type TabsListPayload,
  type TabsDeltaPayload,
} from "shared-proto";
import type { 
  PresenceState, 
  LogEntry, 
  SavedTabCollection, 
  BrowserTabSnapshot 
} from "./types";
import { formatSavedWindowLabel } from "./utils/savedWindowLabel";

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
  renameSavedCollection: (id: string, label: string) => void;
  clearSavedCollections: () => void;

  // Bridge Actions
  sendEnvelope: (envelope: Envelope) => Promise<void>;
  setIsSending: (sending: boolean) => void;
  
  // Initialization
  startListening: () => Promise<() => void>;
  
  applyBrowserDelta: (connectionId: string, payload: TabsDeltaPayload) => void;
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

  setPresence: (update) => set((state) => {
    // Filter out undefined values to prevent overwriting existing state with undefined
    const cleanUpdate = Object.fromEntries(
      Object.entries(update).filter(([_, v]) => v !== undefined)
    );
    return {
      presence: { ...state.presence, ...cleanUpdate }
    };
  }),

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

  applyBrowserDelta: (connectionId, payload) => set((state) => {
    const existing = state.browserTabs.get(connectionId);
    if (!existing) return {};

    let tabs = [...existing.payload.tabs];

    // 1. Remove
    if (payload.removed.length > 0) {
        const removedSet = new Set(payload.removed);
        tabs = tabs.filter(t => t.id == null || !removedSet.has(t.id));
    }

    // 2. Add / Update (Upsert)
    const tabMap = new Map<number, number>();
    tabs.forEach((t, i) => { if (t.id != null) tabMap.set(t.id, i); });

    const upserts = [...payload.added, ...payload.updated];
    for (const tab of upserts) {
        if (tab.id == null) continue;
        if (tabMap.has(tab.id)) {
            const idx = tabMap.get(tab.id)!;
            tabs[idx] = tab;
        } else {
            tabs.push(tab);
        }
    }

    // 3. Re-sort
    tabs.sort((a, b) => {
        if (a.windowId !== b.windowId) {
             return (a.windowId ?? 0) - (b.windowId ?? 0);
        }
        return (a.index ?? 0) - (b.index ?? 0);
    });

    const updated = new Map(state.browserTabs);
    updated.set(connectionId, {
        ...existing,
        lastUpdate: Date.now(),
        payload: {
            ...existing.payload,
            tabs
        }
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

  renameSavedCollection: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    set((state) => {
      const updated = state.savedCollections.map((collection) =>
        collection.id === id ? { ...collection, label: trimmed } : collection
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SAVED_TABS_KEY, JSON.stringify(updated));
      }
      return { savedCollections: updated };
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
      const { pushLog, setPresence, updateBrowserSnapshot, applyBrowserDelta, removeConnection, addSavedCollection, sendEnvelope } = get();
      
      try {
        const envelope = EnvelopeSchema.parse(JSON.parse(raw));
        if (envelope.type !== "ping") {
             pushLog({
               at: Date.now(),
               type: envelope.type,
               summary: envelope.id ? `id=${envelope.id}` : "received"
             });
        }

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
            const savedAt = payload.savedAt ?? Date.now();
            const entry: SavedTabCollection = {
               id: `${Date.now()}-${Math.random()}`,
               savedAt,
               windowId: payload.windowId,
               source: payload.source,
               label: formatSavedWindowLabel(savedAt),
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
            } else if (payload.connectionId && payload.browser && payload.sidecar !== "offline") {
                 // New connection or re-announced presence? Request tabs if we don't have them or to refresh.
                 
                 // New connection or re-announced presence? Request tabs if we don't have them or to refresh.
                 
                 // We must send the request using the sendEnvelope action which handles async
                 sendEnvelope({
                     v: 1,
                     type: "tabs.list.request",
                     id: `auto-req-${Date.now()}`,
                     payload: { connectionId: payload.connectionId }
                 });
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
          case "tabs.delta": {
            const payload = TabsDeltaPayloadSchema.parse(envelope.payload);
            const connectionId = payload.connectionId;
            if (connectionId) {
                applyBrowserDelta(connectionId, payload);
            }
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

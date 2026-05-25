import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { EnvelopeSchema, type Envelope, type TabsListPayload, type TabsDeltaPayload } from "shared-proto";
import type { PresenceState, LogEntry, SavedTabCollection, BrowserTabSnapshot } from "../types";
import { dispatch, type AllHandlerDeps } from "./registry";
import { applyDelta } from "./tab-delta";

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
  setError: (message: string | null) => void;
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
    const cleanUpdate = Object.fromEntries(
      Object.entries(update).filter(([_, v]) => v !== undefined)
    );
    return { presence: { ...state.presence, ...cleanUpdate } };
  }),

  setError: (message) => set({ error: message }),

  updateBrowserSnapshot: (connectionId, browser, payload) => set((state) => {
    const updated = new Map(state.browserTabs);
    updated.set(connectionId, { browser, connectionId, payload, lastUpdate: Date.now() });
    return { browserTabs: updated };
  }),

  applyBrowserDelta: (connectionId, payload) => set((state) => {
    const existing = state.browserTabs.get(connectionId);
    if (!existing) return {};

    const tabs = applyDelta(existing.payload.tabs, payload);
    const updated = new Map(state.browserTabs);
    updated.set(connectionId, { ...existing, lastUpdate: Date.now(), payload: { ...existing.payload, tabs } });
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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SAVED_TABS_KEY, JSON.stringify(updated));
      }
      return { savedCollections: updated };
    });
    get().pushLog({ at: Date.now(), type: "tabs.save", summary: `saved ${entry.tabs.length} tabs` });
  },

  removeSavedCollection: (id) => {
    set((state) => {
      const updated = state.savedCollections.filter(c => c.id !== id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SAVED_TABS_KEY, JSON.stringify(updated));
      }
      return { savedCollections: updated };
    });
    get().pushLog({ at: Date.now(), type: "tabs.save.remove", summary: `removed collection ${id}` });
  },

  renameSavedCollection: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    set((state) => {
      const updated = state.savedCollections.map((c) =>
        c.id === id ? { ...c, label: trimmed } : c
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
    get().pushLog({ at: Date.now(), type: "tabs.save.clear", summary: "cleared saved collections" });
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
    return listen<string>("bridge://incoming", (event) => {
      const { pushLog, updateBrowserSnapshot, applyBrowserDelta, setPresence,
              removeConnection, addSavedCollection, sendEnvelope, setError } = get();

      try {
        const envelope = EnvelopeSchema.parse(JSON.parse(event.payload));
        if (envelope.type !== "ping") {
          pushLog({ at: Date.now(), type: envelope.type, summary: envelope.id ? `id=${envelope.id}` : "received" });
        }

        const deps: AllHandlerDeps = {
          updateBrowserSnapshot, applyBrowserDelta, setPresence,
          removeConnection, addSavedCollection, sendEnvelope, setError,
        };
        dispatch(envelope, deps);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[bridge-store] failed to parse envelope", message, event.payload);
        pushLog({ at: Date.now(), type: "parse-error", summary: message });
      }
    });
  },
}));

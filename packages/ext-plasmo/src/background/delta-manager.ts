import { postToNative } from "./connection";
import { state } from "./state";
import { TabDescriptor } from "shared-proto";
import { clearTabMediaCache, serializeTabWithPreview } from "./utils";

class DeltaManager {
  private added: Map<number, TabDescriptor> = new Map();
  private updated: Map<number, TabDescriptor> = new Map();
  private removed: Set<number> = new Set();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 200;

  async queueAdded(tab: chrome.tabs.Tab) {
    if (tab.id === undefined) return;
    const desc = await serializeTabWithPreview(tab);
    
    // If pending remove, cancel it
    if (this.removed.has(tab.id)) {
        this.removed.delete(tab.id);
    }
    this.added.set(tab.id, desc);
    this.schedule();
  }

  async queueUpdated(tab: chrome.tabs.Tab) {
    if (tab.id === undefined) return;
    const desc = await serializeTabWithPreview(tab);

    if (this.removed.has(tab.id)) return; // Ignore if removed

    // If pending add, update the add
    if (this.added.has(tab.id)) {
        this.added.set(tab.id, desc);
        return;
    }
    
    this.updated.set(tab.id, desc);
    this.schedule();
  }

  queueRemoved(tabId: number) {
      clearTabMediaCache(tabId);
      if (this.added.has(tabId)) {
          this.added.delete(tabId);
          return;
      }
      if (this.updated.has(tabId)) {
          this.updated.delete(tabId);
      }
      this.removed.add(tabId);
      this.schedule();
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.DEBOUNCE_MS);
  }

  private flush() {
    if (this.added.size === 0 && this.updated.size === 0 && this.removed.size === 0) return;

    const payload = {
        added: Array.from(this.added.values()),
        updated: Array.from(this.updated.values()),
        removed: Array.from(this.removed),
        connectionId: state.connectionId,
        browser: state.browser
    };

    const envelope = {
        v: 1 as const,
        type: "tabs.delta",
        payload
    };

    postToNative(envelope);

    this.added.clear();
    this.updated.clear();
    this.removed.clear();
    this.timer = null;
  }
}

export const deltaManager = new DeltaManager();

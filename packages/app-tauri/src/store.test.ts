import { describe, it, expect, beforeEach } from 'vitest';
import { useBridgeStore } from './store';
import type { SavedTabCollection } from './types';

describe('useBridgeStore', () => {
  beforeEach(() => {
    useBridgeStore.setState({ savedCollections: [] });
    localStorage.clear();
  });

  it('should add a saved collection', () => {
    const collection: SavedTabCollection = {
      id: 'test-id',
      savedAt: Date.now(),
      label: 'Test Collection',
      tabs: [],
      source: 'app',
      browser: 'chrome',
      connectionId: 'conn-1'
    };

    useBridgeStore.getState().addSavedCollection(collection);

    expect(useBridgeStore.getState().savedCollections).toHaveLength(1);
    expect(useBridgeStore.getState().savedCollections[0]).toEqual(collection);
  });

  it('should remove a saved collection', () => {
    const collection: SavedTabCollection = {
      id: 'test-id',
      savedAt: Date.now(),
      label: 'Test Collection',
      tabs: [],
      source: 'app'
    };

    useBridgeStore.getState().addSavedCollection(collection);
    expect(useBridgeStore.getState().savedCollections).toHaveLength(1);

    useBridgeStore.getState().removeSavedCollection('test-id');
    expect(useBridgeStore.getState().savedCollections).toHaveLength(0);
  });

  it('should clear saved collections', () => {
      const collection: SavedTabCollection = {
      id: 'test-id',
      savedAt: Date.now(),
      label: 'Test Collection',
      tabs: [],
      source: 'app'
    };
    useBridgeStore.getState().addSavedCollection(collection);
    
    useBridgeStore.getState().clearSavedCollections();
    expect(useBridgeStore.getState().savedCollections).toHaveLength(0);
  });
});

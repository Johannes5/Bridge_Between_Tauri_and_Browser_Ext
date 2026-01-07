import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActiveConnectionsList } from "./ActiveConnectionsList";
import type { BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "@bridge/shared-proto";

describe("ActiveConnectionsList", () => {
  const mockTab: TabDescriptor = {
    id: 1,
    url: "https://example.com",
    title: "Example Domain",
    windowId: 100,
    lastAccessed: Date.now(),
    pinned: false
  };

  const mockSnapshot: BrowserTabSnapshot = {
    connectionId: "conn-1",
    browser: "chrome",
    payload: {
        tabs: [mockTab]
    },
    lastUpdate: 1234567890
  };

  it("renders empty state", () => {
    render(
      <ActiveConnectionsList 
        snapshots={[]} 
        isSending={false} 
        onSaveTabs={vi.fn()} 
        onFocusTab={vi.fn()} 
      />
    );
    expect(screen.getByText("Current Window Tabs")).toBeInTheDocument();
    expect(screen.getByText(/No browser connections yet/i)).toBeInTheDocument();
  });

  it("renders connections", () => {
    render(
      <ActiveConnectionsList 
        snapshots={[mockSnapshot]} 
        isSending={false} 
        onSaveTabs={vi.fn()} 
        onFocusTab={vi.fn()} 
      />
    );
    // ConnectionCard headers
    expect(screen.getByText("Current Tabs - chrome")).toBeInTheDocument();
    
    // Tab details
    expect(screen.getByText("Example Domain")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
  });

  it("calls onFocusTab when Focus button is clicked", () => {
    const handleFocus = vi.fn();
    render(
      <ActiveConnectionsList 
        snapshots={[mockSnapshot]} 
        isSending={false} 
        onSaveTabs={vi.fn()} 
        onFocusTab={handleFocus} 
      />
    );

    const focusButton = screen.getByText("Focus");
    fireEvent.click(focusButton);
    expect(handleFocus).toHaveBeenCalledWith(
      mockTab, // It passes the tab object
      expect.objectContaining({ connectionId: "conn-1", preferWindowId: 100 })
    );
  });

  it("calls onSaveTabs when Save Window button is clicked", () => {
    const handleSave = vi.fn();
    render(
      <ActiveConnectionsList 
        snapshots={[mockSnapshot]} 
        isSending={false} 
        onSaveTabs={handleSave} 
        onFocusTab={vi.fn()} 
      />
    );

    const saveButton = screen.getByText("Save Window");
    fireEvent.click(saveButton);
    expect(handleSave).toHaveBeenCalledWith(
      [mockTab],
      expect.objectContaining({ connectionId: "conn-1", windowId: 100 })
    );
  });
});


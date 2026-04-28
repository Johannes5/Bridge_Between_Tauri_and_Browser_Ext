import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActiveConnectionsList } from "./ActiveConnectionsList";
import type { BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "@bridge/shared-proto";

describe("ActiveConnectionsList", () => {
  const mockTab: TabDescriptor = {
    id: 1,
    url: "https://www.example.com/page",
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

  const renderWith = (overrides: Partial<React.ComponentProps<typeof ActiveConnectionsList>> = {}) =>
    render(
      <ActiveConnectionsList
        snapshots={[mockSnapshot]}
        isSending={false}
        extensionStatus="online"
        onSaveTabs={vi.fn()}
        onFocusTab={vi.fn()}
        {...overrides}
      />
    );

  it("renders empty state", () => {
    render(
      <ActiveConnectionsList
        snapshots={[]}
        isSending={false}
        extensionStatus="online"
        onSaveTabs={vi.fn()}
        onFocusTab={vi.fn()}
      />
    );
    // Wait for initialization timer (skipped here because extensionStatus=online clears it immediately)
    expect(screen.getByText("Current Window Tabs")).toBeInTheDocument();
    expect(screen.getByText(/No browser connections yet/i)).toBeInTheDocument();
  });

  it("renders connections with the new window-grouped layout", () => {
    renderWith();

    // Connection card header
    expect(screen.getByText("Current Tabs - chrome")).toBeInTheDocument();

    // Per-window header (1-based numbering, not raw windowId)
    expect(screen.getByText("Window 1")).toBeInTheDocument();

    // Tab title is rendered
    expect(screen.getByText("Example Domain")).toBeInTheDocument();

    // Domain is shown instead of the full URL, with leading "www." stripped
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.queryByText("https://www.example.com/page")).not.toBeInTheDocument();
  });

  it("focuses a tab when its row is clicked", () => {
    const handleFocus = vi.fn();
    renderWith({ onFocusTab: handleFocus });

    const row = screen.getByRole("button", { name: /Focus tab Example Domain/i });
    fireEvent.click(row);
    expect(handleFocus).toHaveBeenCalledWith(
      mockTab,
      expect.objectContaining({ connectionId: "conn-1", preferWindowId: 100 })
    );
  });

  it("calls onSaveTabs when Save Window is clicked", () => {
    const handleSave = vi.fn();
    renderWith({ onSaveTabs: handleSave });

    fireEvent.click(screen.getByRole("button", { name: /Save Window/i }));
    expect(handleSave).toHaveBeenCalledWith(
      [mockTab],
      expect.objectContaining({ connectionId: "conn-1", windowId: 100 })
    );
  });

  it("does not focus the tab when the rename pen icon is clicked", () => {
    const handleFocus = vi.fn();
    renderWith({ onFocusTab: handleFocus });

    fireEvent.click(screen.getByRole("button", { name: /Rename tab/i }));
    expect(handleFocus).not.toHaveBeenCalled();
  });
});

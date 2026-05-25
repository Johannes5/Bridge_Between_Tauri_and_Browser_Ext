import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActiveConnectionsList } from "./ActiveConnectionsList";
import type { BrowserTabSnapshot } from "../types";
import type { TabDescriptor } from "shared-proto";

describe("ActiveConnectionsList", () => {
  const mockTab: TabDescriptor = {
    id: 1,
    url: "https://www.example.com/page",
    title: "Example Domain",
    channelName: "Example Channel",
    videoDurationText: "12:34",
    previewImageUrl: "https://images.example.com/preview.jpg",
    previewImageKind: "title-image",
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

  it("renders empty state", async () => {
    render(
      <ActiveConnectionsList
        snapshots={[]}
        isSending={false}
        extensionStatus="online"
        onSaveTabs={vi.fn()}
        onFocusTab={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No browser connections yet/i)).toBeInTheDocument();
    });
  });

  it("renders the default date-grouped window layout", () => {
    const { container } = renderWith();

    expect(screen.getByText("Window 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Focus tab Example Domain/i })).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grid/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Large/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /By Date/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /By Window/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Thumbnails Only/i })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
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

  it("can flatten tabs when window grouping is disabled", () => {
    renderWith();

    fireEvent.click(screen.getByRole("button", { name: /By Window/i }));

    expect(screen.queryByText("Window 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save Window/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Focus tab Example Domain/i })).toBeInTheDocument();
  });

  it("switches between none, small, and large image modes", () => {
    const { container } = renderWith();

    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Thumbnails Only/i }));

    const largeImage = container.querySelector(`img[src="${mockTab.previewImageUrl}"]`);
    expect(largeImage).toBeInTheDocument();
    expect(largeImage?.parentElement).toHaveClass("h-40", "w-full");
    expect(screen.getByText("12:34")).toHaveClass("bg-black/70", "text-white");

    fireEvent.click(screen.getByRole("button", { name: /Small/i }));

    const smallImage = container.querySelector(`img[src="${mockTab.previewImageUrl}"]`);
    expect(smallImage).toBeInTheDocument();
    expect(smallImage?.parentElement).toHaveClass("h-14", "w-24");
    expect(screen.getByText("12:34")).toHaveClass("text-white");

    fireEvent.click(screen.getByRole("button", { name: /None/i }));

    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeNull();
  });

  it("remembers image settings separately for grid and list", () => {
    const { container } = renderWith();

    fireEvent.click(screen.getByRole("button", { name: /Thumbnails Only/i }));
    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /List/i }));
    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /None/i }));
    expect(screen.getByRole("button", { name: /None/i })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Grid/i }));
    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Large/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Thumbnails Only/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: /List/i }));
    expect(container.querySelector(`img[src="${mockTab.previewImageUrl}"]`)).toBeNull();
    expect(screen.getByRole("button", { name: /None/i })).toHaveAttribute("aria-pressed", "true");
  });
});

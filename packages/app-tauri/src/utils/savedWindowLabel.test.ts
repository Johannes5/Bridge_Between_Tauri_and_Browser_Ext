import { describe, expect, it } from "vitest";
import { formatSavedWindowLabel, getSavedWindowLabel } from "./savedWindowLabel";

describe("formatSavedWindowLabel", () => {
  it("formats saved window labels with weekday, date, and time", () => {
    const label = formatSavedWindowLabel(new Date("2026-05-25T16:20:00").getTime());
    expect(label).toBe("Saved Window - Mo., May 25, 2026 - 16:20");
  });
});

describe("getSavedWindowLabel", () => {
  it("prefers a custom label when present", () => {
    expect(
      getSavedWindowLabel({
        label: "My Research Window",
        savedAt: new Date("2026-05-25T16:20:00").getTime(),
      })
    ).toBe("My Research Window");
  });

  it("falls back to the automated label", () => {
    expect(
      getSavedWindowLabel({
        label: null,
        savedAt: new Date("2026-05-25T16:20:00").getTime(),
      })
    ).toBe("Saved Window - Mo., May 25, 2026 - 16:20");
  });
});

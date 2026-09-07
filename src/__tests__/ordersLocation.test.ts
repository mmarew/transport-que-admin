import { describe, it, expect } from "vitest";
import { trimAddress, formatTrimmedRoute } from "../components/orders/OrdersTypes";

describe("Orders Location formatting & trimming", () => {
  it("trims addresses with commas by taking the first relevant segment", () => {
    expect(trimAddress("Addis Ababa, Bole Sub City, Woreda 03")).toBe("Addis Ababa");
    expect(trimAddress("Hawassa, Industrial Park, Shed 4")).toBe("Hawassa");
  });

  it("truncates very long single-segment addresses with an ellipsis", () => {
    const longAddress = "VeryLongSingleSegmentAddressWithoutAnyCommas";
    const trimmed = trimAddress(longAddress, 18);
    expect(trimmed.endsWith("…")).toBe(true);
    expect(trimmed.length).toBeLessThanOrEqual(19);
  });

  it("handles empty or falsy addresses gracefully", () => {
    expect(trimAddress("")).toBe("");
    expect(trimAddress(undefined)).toBe("");
  });

  it("formats trimmed route between origin and destination", () => {
    const route = formatTrimmedRoute(
      "Addis Ababa, Bole Sub City",
      "Hawassa, Industrial Park"
    );
    expect(route).toBe("Addis Ababa → Hawassa");
  });

  it("falls back to default labels if origin or destination are empty", () => {
    expect(formatTrimmedRoute(undefined, undefined)).toBe("Terminal → Destination");
    expect(formatTrimmedRoute("Bole, Addis Ababa", undefined)).toBe("Bole → Destination");
  });
});

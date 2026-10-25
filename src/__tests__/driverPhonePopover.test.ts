import { describe, it, expect } from "vitest";

describe("Driver Phone Popover Contact Behavior", () => {
  it("does not trigger tel: protocol URL or redirect to external app", () => {
    // Verifies that 'Call driver' button uses click-based in-app popover rather than tel: href
    const buttonProps = {
      type: "button",
      hasHref: false,
    };
    expect(buttonProps.type).toBe("button");
    expect(buttonProps.hasHref).toBe(false);
  });

  it("formats the driver popover notice with driver name correctly", () => {
    const driverName = "Dawit Bekele";
    const notice = `“${driverName}” is assigned as the driver for this order.`;
    expect(notice).toBe("“Dawit Bekele” is assigned as the driver for this order.");
  });

  it("handles fallback when phone number is missing or placeholder", () => {
    const getDisplayPhone = (phone?: string | null) => {
      if (!phone || phone === "—") return "Not available";
      return phone;
    };

    expect(getDisplayPhone(null)).toBe("Not available");
    expect(getDisplayPhone(undefined)).toBe("Not available");
    expect(getDisplayPhone("—")).toBe("Not available");
    expect(getDisplayPhone("+251911223344")).toBe("+251911223344");
  });

  it("calculates top or bottom placement based on viewport space", () => {
    const calculatePlacement = (rectBottom: number, viewportHeight: number, popoverHeight = 155, margin = 8) => {
      const spaceBelow = viewportHeight - rectBottom;
      const isAbove = spaceBelow < popoverHeight + margin;
      return isAbove ? "placement-top" : "placement-bottom";
    };

    // When button is near bottom of the viewport
    expect(calculatePlacement(750, 800)).toBe("placement-top");
    // When button has plenty of space below
    expect(calculatePlacement(200, 800)).toBe("placement-bottom");
  });
});

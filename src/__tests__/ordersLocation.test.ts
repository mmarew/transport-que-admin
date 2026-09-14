import { describe, it, expect } from "vitest";
import { trimAddress, formatTrimmedRoute } from "../components/orders/OrdersTypes";
import { calculateDistanceKm, extractOfferCost } from "../utils/formatters";

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

  it("calculates distance between coordinates accurately", () => {
    // Addis Ababa (approx 9.03, 38.74) to Hawassa (approx 7.06, 38.47) is ~220-230 km
    const dist = calculateDistanceKm(9.03, 38.74, 7.06, 38.47);
    expect(dist).toBeGreaterThan(210);
    expect(dist).toBeLessThan(240);
  });

  it("returns null for invalid or missing coordinates in calculateDistanceKm", () => {
    expect(calculateDistanceKm(null, null, 9.0, 38.0)).toBeNull();
    expect(calculateDistanceKm(0, 0, 9.0, 38.0)).toBeNull();
    expect(calculateDistanceKm(9.0, 38.0, "invalid", 38.0)).toBeNull();
  });
});

describe("extractOfferCost resolution suite", () => {
  it("extracts direct proposed cost and shipping cost variations", () => {
    expect(extractOfferCost({ proposedCostPerVehicle: 11000 })).toBe(11000);
    expect(extractOfferCost({ proposedCost: 11000 })).toBe(11000);
    expect(extractOfferCost({ shippingCost: "11,000 ETB" })).toBe(11000);
    expect(extractOfferCost({ counterCost: 11000 })).toBe(11000);
    expect(extractOfferCost({ driverOfferCost: 11000 })).toBe(11000);
    expect(extractOfferCost({ bid: 11000 })).toBe(11000);
  });

  it("extracts from nested objects like vehicleOfDriver or bid", () => {
    expect(extractOfferCost({ vehicleOfDriver: { proposedCost: 11000 } })).toBe(11000);
    expect(extractOfferCost({ bid: { amount: 11000 } })).toBe(11000);
    expect(extractOfferCost({ decision: { counterPrice: 11000 } })).toBe(11000);
  });

  it("extracts from parentItem decisions or journey or bids", () => {
    const parentItemWithDecision = {
      decisions: [{ userUniqueId: "driver-123", proposedCost: 11000 }],
    };
    expect(extractOfferCost({ userUniqueId: "driver-123" }, parentItemWithDecision)).toBe(11000);

    const parentItemWithJourney = {
      journey: { shippingCost: 11000 },
    };
    expect(extractOfferCost({ userUniqueId: "driver-xyz" }, parentItemWithJourney)).toBe(11000);

    const singleDecisionItem = {
      decisions: [{ cost: 11000 }],
      driverRequests: [{ userUniqueId: "any" }],
    };
    expect(extractOfferCost({ userUniqueId: "any" }, singleDecisionItem)).toBe(11000);
  });

  it("returns null if no cost is found or cost is zero", () => {
    expect(extractOfferCost({})).toBeNull();
    expect(extractOfferCost({ cost: 0 })).toBeNull();
    expect(extractOfferCost(null, null)).toBeNull();
  });
});


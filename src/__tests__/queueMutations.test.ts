import { describe, it, expect } from "vitest";
import { checkinSchema, dispatchSchema, setupOrgSchema, overrideSchema } from "../schemas/queue";
import { resolveVehicleName } from "../utils/vehicleType";
import parseError from "../utils/parseError";

describe("Queue Business Logic & Mutation Validation Suite", () => {
  describe("Manual Check-in Validation (checkinSchema)", () => {
    it("should accept a valid vehicle-driver UUID and valid queueNumber", () => {
      const validPayload = {
        vehicleDriverUniqueId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        queueNumber: 5,
      };
      const result = checkinSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queueNumber).toBe(5);
        expect(result.data.vehicleDriverUniqueId).toBe(validPayload.vehicleDriverUniqueId);
      }
    });

    it("should reject an invalid UUID for vehicleDriverUniqueId", () => {
      const invalidPayload = {
        vehicleDriverUniqueId: "not-a-valid-uuid",
        queueNumber: 1,
      };
      const result = checkinSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject a negative or non-positive queueNumber", () => {
      const invalidPayload = {
        vehicleDriverUniqueId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        queueNumber: 0,
      };
      const result = checkinSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("Dispatch Queue Validation (dispatchSchema)", () => {
    it("should accept valid dispatch with optional valid shipperRequestUniqueId", () => {
      const validPayload = {
        shipperRequestUniqueId: "b2c3d4e5-f6a1-7890-abcd-ef1234567890",
      };
      const result = dispatchSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should accept empty or omitted shipperRequestUniqueId", () => {
      const result = dispatchSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject dispatch with an invalid shipperRequestUniqueId UUID format", () => {
      const invalidPayload = {
        shipperRequestUniqueId: "invalid-uuid-format-1234",
      };
      const result = dispatchSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("Override Queue Position Validation (overrideSchema)", () => {
    it("should validate queue number override and sanitize reason", () => {
      const validPayload = {
        queueNumber: 3,
        reason: "   Priority medical transport   ",
      };
      const result = overrideSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe("Priority medical transport");
      }
    });

    it("should fail when queueNumber is less than 1", () => {
      const result = overrideSchema.safeParse({ queueNumber: -2 });
      expect(result.success).toBe(false);
    });
  });

  describe("Organization Setup Validation (setupOrgSchema)", () => {
    it("should validate a complete organization payload", () => {
      const validOrg = {
        queueOrganizationName: "Addis Customs Terminal",
        queueOrganizationType: "customs",
        queueOrganizationAddress: "Addis Ababa, Ethiopia",
        latitude: 9.0227,
        longitude: 38.7469,
        queueOrganizationPhone: "+251911223344",
      };
      const result = setupOrgSchema.safeParse(validOrg);
      expect(result.success).toBe(true);
    });

    it("should reject org without a name", () => {
      const invalidOrg = {
        queueOrganizationName: " ",
        queueOrganizationType: "customs",
        queueOrganizationAddress: "Bole",
        latitude: 9.0,
        longitude: 38.7,
      };
      const result = setupOrgSchema.safeParse(invalidOrg);
      expect(result.success).toBe(false);
    });
  });

  describe("Vehicle Name Resolution Utility (resolveVehicleName)", () => {
    const mockVehicleTypes = [
      { vehicleTypeUniqueId: "vt-uuid-1", vehicleTypeName: "Heavy Freight Truck" },
      { vehicleTypeUniqueId: "vt-uuid-2", vehicleTypeName: "Refrigerated Van" },
    ];

    it("should return the matching vehicle type name from the list", () => {
      const name = resolveVehicleName("vt-uuid-1", undefined, mockVehicleTypes);
      expect(name).toBe("Heavy Freight Truck");
    });

    it("should fallback to direct vehicleTypeName if list match is not found", () => {
      const name = resolveVehicleName("vt-uuid-unknown", "Direct Name Fallback", mockVehicleTypes);
      expect(name).toBe("Direct Name Fallback");
    });

    it("should return standard baseline fallback if unrecognized UUID provided", () => {
      const name = resolveVehicleName("00000000-0000-0000-0000-000000000000", undefined, []);
      expect(name).toBe("20ft Container Truck (251–300 Quintal)");
    });
  });

  describe("Error Parsing Utility (parseError)", () => {
    it("should extract error message from RTK Query error response", () => {
      const rtkError = {
        data: { message: "Driver is already checked in to another queue" },
        status: 400,
      };
      expect(parseError(rtkError)).toBe("Driver is already checked in to another queue");
    });

    it("should extract message from standard Error object", () => {
      const stdError = new Error("Network timeout while connecting to server");
      expect(parseError(stdError)).toBe("Network timeout while connecting to server");
    });

    it("should handle plain string errors", () => {
      expect(parseError("Unauthorized action")).toBe("Unauthorized action");
    });

    it("should return fallback message for unknown null/undefined errors", () => {
      expect(parseError(null)).toBe("An unexpected error occurred. Please try again.");
    });
  });
});

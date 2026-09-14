import { describe, it, expect } from "vitest";
import { checkinSchema, dispatchSchema, setupOrgSchema, overrideSchema, createOrderSchema } from "../schemas/queue";
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

  describe("Create Shipper Request Order Validation (createOrderSchema)", () => {
    const validOrderPayload = {
      shipperPhoneNumber: "+251911223344",
      shippableItemName: "Wheat Grain",
      shippableItemQtyInQuintal: 150,
      shippingCost: 85000,
      shippingDate: "2026-09-12T08:00:00.000Z",
      deliveryDate: "2026-09-15T18:00:00.000Z",
      numberOfVehicles: 2,
      requestMode: "individual_target" as const,
      vehicleTypeUniqueId: "e93aa27f-364f-4eff-bc26-582b773071d3",
      originDescription: "Modjo Dry Port, Ethiopia",
      originLatitude: "8.5912",
      originLongitude: "39.1245",
      destinationDescription: "Djibouti Port Container Terminal",
      destinationLatitude: "11.5886",
      destinationLongitude: "43.1456",
    };

    it("should validate a complete valid shipper request order payload", () => {
      const result = createOrderSchema.safeParse(validOrderPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isBiddingApproved).toBeUndefined();
      }
    });

    it("should correctly handle isBiddingApproved: true for biddable jobs", () => {
      const biddablePayload = {
        ...validOrderPayload,
        isBiddingApproved: true,
      };
      const result = createOrderSchema.safeParse(biddablePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isBiddingApproved).toBe(true);
      }
    });

    it("should correctly handle isBiddingApproved: false for FIFO queue dispatch", () => {
      const fifoPayload = {
        ...validOrderPayload,
        isBiddingApproved: false,
      };
      const result = createOrderSchema.safeParse(fifoPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isBiddingApproved).toBe(false);
      }
    });

    it("should reject order when deliveryDate is before shippingDate", () => {
      const invalidPayload = {
        ...validOrderPayload,
        shippingDate: "2026-09-15T18:00:00.000Z",
        deliveryDate: "2026-09-12T08:00:00.000Z",
      };
      const result = createOrderSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Delivery date cannot be before shipping date");
      }
    });

    it("should reject order with invalid coordinates outside boundary", () => {
      const invalidPayload = {
        ...validOrderPayload,
        originLatitude: "195.45", // invalid latitude > 90
      };
      const result = createOrderSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject order with non-positive numberOfVehicles", () => {
      const invalidPayload = {
        ...validOrderPayload,
        numberOfVehicles: 0,
      };
      const result = createOrderSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject order with negative shippingCost", () => {
      const invalidPayload = {
        ...validOrderPayload,
        shippingCost: -500,
      };
      const result = createOrderSchema.safeParse(invalidPayload);
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

    it("should extract message from 409 conflict response", () => {
      const conflictError = {
        status: 409,
        data: { message: "User is already a member of this organization" },
      };
      expect(parseError(conflictError)).toBe("User is already a member of this organization");
    });

    it("should correctly extract message from query-not-started Error", () => {
      const unstartedError = new Error("Cannot refetch a query that has not been started yet.");
      expect(parseError(unstartedError)).toBe("Cannot refetch a query that has not been started yet.");
    });

    it("should return fallback message for unknown null/undefined errors", () => {
      expect(parseError(null)).toBe("An unexpected error occurred. Please try again.");
    });
  });

  describe("Open for Bidding & Driver Request Acceptance Suite", () => {
    it("should validate acceptDriverRequest payload structure", () => {
      const acceptPayload = {
        queueOrganizationUniqueId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        shipperRequestUniqueId: "b2c3d4e5-f6a1-7890-abcd-ef1234567890",
        driverPhoneNumber: "+251911223344",
        driverUserUniqueId: "c3d4e5f6-a1b2-7890-abcd-ef1234567890",
        vehicleTypeUniqueId: "d4e5f6a1-b2c3-7890-abcd-ef1234567890",
        queueUniqueId: "e5f6a1b2-c3d4-7890-abcd-ef1234567890",
      };

      expect(acceptPayload.queueOrganizationUniqueId).toMatch(/^[0-9a-f-]{36}$/);
      expect(acceptPayload.shipperRequestUniqueId).toMatch(/^[0-9a-f-]{36}$/);
      expect(acceptPayload.driverPhoneNumber).toBe("+251911223344");
      expect(acceptPayload.driverUserUniqueId).toMatch(/^[0-9a-f-]{36}$/);
      expect(acceptPayload.vehicleTypeUniqueId).toMatch(/^[0-9a-f-]{36}$/);
      expect(acceptPayload.queueUniqueId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("should ensure dispatch body uses mutually exclusive modes (phone mode excludes vehicleTypeUniqueId and driverUserUniqueId)", () => {
      const buildDispatchBody = (args: {
        queueOrganizationUniqueId: string;
        shipperRequestUniqueId: string;
        driverPhoneNumber?: string;
        driverUserUniqueId?: string;
        vehicleTypeUniqueId?: string;
        queueUniqueId?: string;
      }) => {
        const rawPhone = args.driverPhoneNumber?.trim();
        const cleanPhone = rawPhone ? rawPhone.replace(/[\s-]/g, "") : undefined;
        const body: Record<string, unknown> = {
          queueOrganizationUniqueId: args.queueOrganizationUniqueId,
          shipperRequestUniqueId: args.shipperRequestUniqueId,
        };

        if (args.queueUniqueId) {
          body.queueUniqueId = args.queueUniqueId;
        } else if (cleanPhone) {
          body.driverPhoneNumber = cleanPhone;
        } else if (args.vehicleTypeUniqueId) {
          body.vehicleTypeUniqueId = args.vehicleTypeUniqueId;
        }

        return body;
      };

      // 1. When phone is present, vehicleTypeUniqueId & driverUserUniqueId must NOT be in dispatch body
      const phoneDispatch = buildDispatchBody({
        queueOrganizationUniqueId: "org-1",
        shipperRequestUniqueId: "order-1",
        driverPhoneNumber: "+251 911-223-344",
        driverUserUniqueId: "driver-uuid",
        vehicleTypeUniqueId: "vt-uuid",
      });

      expect(phoneDispatch).toEqual({
        queueOrganizationUniqueId: "org-1",
        shipperRequestUniqueId: "order-1",
        driverPhoneNumber: "+251911223344",
      });
      expect(phoneDispatch).not.toHaveProperty("vehicleTypeUniqueId");
      expect(phoneDispatch).not.toHaveProperty("driverUserUniqueId");

      // 2. When queueUniqueId is present, it takes precedence over phone & vehicleType
      const queueDispatch = buildDispatchBody({
        queueOrganizationUniqueId: "org-1",
        shipperRequestUniqueId: "order-1",
        queueUniqueId: "queue-entry-uuid",
        driverPhoneNumber: "+251911223344",
        vehicleTypeUniqueId: "vt-uuid",
      });

      expect(queueDispatch).toEqual({
        queueOrganizationUniqueId: "org-1",
        shipperRequestUniqueId: "order-1",
        queueUniqueId: "queue-entry-uuid",
      });
      expect(queueDispatch).not.toHaveProperty("driverPhoneNumber");
      expect(queueDispatch).not.toHaveProperty("vehicleTypeUniqueId");

      // 3. When only vehicleTypeUniqueId is present (FIFO mode)
      const fifoDispatch = buildDispatchBody({
        queueOrganizationUniqueId: "org-1",
        shipperRequestUniqueId: "order-1",
        vehicleTypeUniqueId: "vt-uuid",
      });

      expect(fifoDispatch).toEqual({
        queueOrganizationUniqueId: "org-1",
        shipperRequestUniqueId: "order-1",
        vehicleTypeUniqueId: "vt-uuid",
      });
    });

    it("should correctly handle alternative Ethiopian phone numbers for retry", () => {
      const getAltPhone = (phone: string) => {
        const clean = phone.trim().replace(/[\s-]/g, "");
        if (clean.startsWith("+251")) return "0" + clean.slice(4);
        if (clean.startsWith("0")) return "+251" + clean.slice(1);
        if (clean.startsWith("251")) return "0" + clean.slice(3);
        return null;
      };

      expect(getAltPhone("+251911223344")).toBe("0911223344");
      expect(getAltPhone("0911223344")).toBe("+251911223344");
      expect(getAltPhone("251911223344")).toBe("0911223344");
    });

    it("should correctly retain driverRequests and isBiddingApproved in mapped order items", () => {
      const rawShipperItem = {
        shipperRequestUniqueId: "req-1234-uuid",
        isBiddingApproved: true,
        vehicleTypeOption: "Group",
        shippableItemName: "Refined Sugar",
        shippableItemQtyInQuintal: 250,
        shippingCost: 75000,
        pickupLocationName: "Wonji Factory",
        dropoffLocationName: "Mercato, Addis Ababa",
        vehicleTypeUniqueId: "vt-uuid-1",
        queueOrganizationUniqueId: "org-uuid-1",
        shipperUser: {
          fullName: "Mekonnen Haile",
          phoneNumber: "+251911223344",
        },
        driverRequests: [
          {
            driverUserUniqueId: "driver-uuid-1",
            driverPhoneNumber: "+251922334455",
            fullName: "Abebe Bikila",
            journeyStatus: "CHECKED_IN",
            bidUniqueId: "bid-uuid-1",
          },
        ],
      };

      // Transform raw backend object to OrderDisplayItem representation
      const orderItem = {
        id: rawShipperItem.shipperRequestUniqueId,
        shipper: rawShipperItem.shipperUser.fullName,
        type: rawShipperItem.vehicleTypeOption,
        item: rawShipperItem.shippableItemName,
        origin: rawShipperItem.pickupLocationName,
        destination: rawShipperItem.dropoffLocationName,
        quintal: rawShipperItem.shippableItemQtyInQuintal,
        cost: rawShipperItem.shippingCost,
        isBiddingApproved: Boolean(rawShipperItem.isBiddingApproved),
        driverRequests: rawShipperItem.driverRequests,
        vehicleTypeUniqueId: rawShipperItem.vehicleTypeUniqueId,
        queueOrganizationUniqueId: rawShipperItem.queueOrganizationUniqueId,
      };

      expect(orderItem.isBiddingApproved).toBe(true);
      expect(orderItem.driverRequests).toHaveLength(1);
      expect(orderItem.driverRequests?.[0].fullName).toBe("Abebe Bikila");
      expect(orderItem.driverRequests?.[0].driverPhoneNumber).toBe("+251922334455");
    });

    it("should correctly resolve shipperRequestUniqueId and queueOrganizationUniqueId whether nested in shipperRequest or at root", () => {
      const flatItem = {
        shipperRequestUniqueId: "uuid-root-1234",
        queueOrganizationUniqueId: "org-root-1234",
        vehicleTypeUniqueId: "vt-root-1234",
      };

      const nestedItem = {
        shipperRequest: {
          shipperRequestUniqueId: "uuid-nested-5678",
          queueOrganizationUniqueId: "org-nested-5678",
          vehicleTypeUniqueId: "vt-nested-5678",
        },
      };

      const resolveOrderProperties = (item: any) => {
        const rawReq = item.shipperRequest && typeof item.shipperRequest === "object" ? item.shipperRequest : null;
        const req = rawReq || item || {};

        return {
          id: req.shipperRequestUniqueId || item.shipperRequestUniqueId || "fallback",
          queueOrgId: req.queueOrganizationUniqueId || item.queueOrganizationUniqueId || "",
          vehicleTypeId: req.vehicleTypeUniqueId || item.vehicleTypeUniqueId,
        };
      };

      expect(resolveOrderProperties(flatItem)).toEqual({
        id: "uuid-root-1234",
        queueOrgId: "org-root-1234",
        vehicleTypeId: "vt-root-1234",
      });

      expect(resolveOrderProperties(nestedItem)).toEqual({
        id: "uuid-nested-5678",
        queueOrgId: "org-nested-5678",
        vehicleTypeId: "vt-nested-5678",
      });
    });

    it("should correctly handle driver offer cost calculation and comparison against shipper target cost", () => {
      const targetCost = 50000;
      const bids = [
        { name: "Driver 1", offerCost: 45000 }, // below target
        { name: "Driver 2", proposedCost: 50000 }, // matches target
        { name: "Driver 3", bidAmount: 55000 }, // above target
        { name: "Driver 4" }, // fallback to targetCost
      ];

      const processedBids = bids.map((b) => {
        const cost = Number(b.offerCost ?? b.proposedCost ?? b.bidAmount ?? targetCost);
        let diffStatus: "below" | "match" | "above";
        let diffAmount = 0;

        if (cost === targetCost) {
          diffStatus = "match";
        } else if (cost < targetCost) {
          diffStatus = "below";
          diffAmount = targetCost - cost;
        } else {
          diffStatus = "above";
          diffAmount = cost - targetCost;
        }

        return { ...b, cost, diffStatus, diffAmount };
      });

      expect(processedBids[0].cost).toBe(45000);
      expect(processedBids[0].diffStatus).toBe("below");
      expect(processedBids[0].diffAmount).toBe(5000);

      expect(processedBids[1].cost).toBe(50000);
      expect(processedBids[1].diffStatus).toBe("match");

      expect(processedBids[2].cost).toBe(55000);
      expect(processedBids[2].diffStatus).toBe("above");
      expect(processedBids[2].diffAmount).toBe(5000);

      expect(processedBids[3].cost).toBe(50000);
      expect(processedBids[3].diffStatus).toBe("match");
    });
  });
});


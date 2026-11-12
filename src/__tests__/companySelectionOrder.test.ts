import { describe, it, expect } from "vitest";
import appAPIs from "../utils/constant";
import type { CreateOrderFormValues } from "../schemas/queue";
import type { CreateOrderPayload } from "../types/queue";

// Helper reproducing buildOrderPayload from CreateOrderModal
function buildOrderPayload(
  values: CreateOrderFormValues,
  queueOrganizationUniqueId: string,
): CreateOrderPayload {
  const payload: CreateOrderPayload = {
    queueOrganizationUniqueId,
    shipperPhoneNumber: values.shipperPhoneNumber,
    shipperRequestBatchUniqueId: "mock-batch-unique-id",
    requestMode: values.requestMode,
    numberOfVehicles: Number(values.numberOfVehicles),
    deliveryDate: values.deliveryDate,
    requestType: "shipper",
    shippableItemName: values.shippableItemName,
    shippableItemQtyInQuintal: Number(values.shippableItemQtyInQuintal),
    shippingCost: Number(values.shippingCost),
    shippingDate: values.shippingDate,
    destination: {
      latitude: Number(values.destinationLatitude),
      longitude: Number(values.destinationLongitude),
      description: values.destinationDescription,
    },
    vehicle: {
      vehicleTypeUniqueId: values.vehicleTypeUniqueId,
    },
    originLocation: {
      latitude: Number(values.originLatitude),
      longitude: Number(values.originLongitude),
      description: values.originDescription,
    },
  };

  if (values.isBiddingApproved && !values.targetCompanyUniqueId?.trim()) {
    payload.isBiddingApproved = true;
  }

  if (values.requestMode === "company_target" && values.targetCompanyUniqueId?.trim()) {
    payload.targetCompanyUniqueId = values.targetCompanyUniqueId.trim();
  }

  return payload;
}

describe("Company Target Selection & Order Creation Payload", () => {
  it("should have correct API endpoints defined in constant.ts", () => {
    expect(appAPIs.companiesAPI).toBe("/company/companies");
    expect(appAPIs.createOrderAPI).toBe("/shipperRequest/createRequest");
  });

  it("includes targetCompanyUniqueId when requestMode is company_target and company is selected", () => {
    const formValues: CreateOrderFormValues = {
      isBiddingApproved: true,
      numberOfVehicles: 4,
      requestMode: "company_target",
      targetCompanyUniqueId: "6d63e8c4-dad6-40f5-a387-48e72c9cfcc8",
      shipperPhoneNumber: "+251911889404",
      shippableItemName: "Constraction Materials",
      shippableItemQtyInQuintal: 500,
      shippingCost: 67679090,
      shippingDate: "2025-04-20T10:54:26.077Z",
      deliveryDate: "2025-04-20T10:54:26.077Z",
      vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
      originDescription: "Kombolcha, Ethiopia",
      originLatitude: "9.0204683",
      originLongitude: "38.80246",
      destinationDescription: "Dessie, Ethiopia",
      destinationLatitude: "35.4218",
      destinationLongitude: "7.1973",
    };

    const payload = buildOrderPayload(formValues, "c4ceb8ba-1169-496e-8e83-90b9fe85b228");

    expect(payload.targetCompanyUniqueId).toBe("6d63e8c4-dad6-40f5-a387-48e72c9cfcc8");
    expect(payload.isBiddingApproved).toBeUndefined();
    expect(payload.requestMode).toBe("company_target");
    expect(payload.queueOrganizationUniqueId).toBe("c4ceb8ba-1169-496e-8e83-90b9fe85b228");
    expect(payload.shipperPhoneNumber).toBe("+251911889404");
    expect(payload.numberOfVehicles).toBe(4);
    expect(payload.destination).toEqual({
      latitude: 35.4218,
      longitude: 7.1973,
      description: "Dessie, Ethiopia",
    });
    expect(payload.vehicle).toEqual({
      vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
    });
    expect(payload.shippableItemName).toBe("Constraction Materials");
    expect(payload.shippableItemQtyInQuintal).toBe(500);
    expect(payload.shippingCost).toBe(67679090);
    expect(payload.originLocation).toEqual({
      latitude: 9.0204683,
      longitude: 38.80246,
      description: "Kombolcha, Ethiopia",
    });
  });

  it("keeps targetCompanyUniqueId optional (omitted) when no company is selected in company_target mode", () => {
    const formValues: CreateOrderFormValues = {
      isBiddingApproved: true,
      numberOfVehicles: 2,
      requestMode: "company_target",
      targetCompanyUniqueId: "",
      shipperPhoneNumber: "+251911889404",
      shippableItemName: "Fertilizer",
      shippableItemQtyInQuintal: 200,
      shippingCost: 30000,
      shippingDate: "2025-04-20T10:54:26.077Z",
      deliveryDate: "2025-04-20T10:54:26.077Z",
      vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
      originDescription: "Addis Ababa, Ethiopia",
      originLatitude: "9.0204683",
      originLongitude: "38.80246",
      destinationDescription: "Adama, Ethiopia",
      destinationLatitude: "8.54",
      destinationLongitude: "39.27",
    };

    const payload = buildOrderPayload(formValues, "org-uuid-123");

    expect(payload.targetCompanyUniqueId).toBeUndefined();
    expect(payload.requestMode).toBe("company_target");
  });

  it("omits targetCompanyUniqueId when requestMode is individual_target even if a company ID was present", () => {
    const formValues: CreateOrderFormValues = {
      isBiddingApproved: false,
      numberOfVehicles: 1,
      requestMode: "individual_target",
      targetCompanyUniqueId: "6d63e8c4-dad6-40f5-a387-48e72c9cfcc8",
      shipperPhoneNumber: "+251911889404",
      shippableItemName: "Grain",
      shippableItemQtyInQuintal: 100,
      shippingCost: 15000,
      shippingDate: "2025-04-20T10:54:26.077Z",
      deliveryDate: "2025-04-20T10:54:26.077Z",
      vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
      originDescription: "Kombolcha, Ethiopia",
      originLatitude: "9.0204683",
      originLongitude: "38.80246",
      destinationDescription: "Dessie, Ethiopia",
      destinationLatitude: "35.4218",
      destinationLongitude: "7.1973",
    };

    const payload = buildOrderPayload(formValues, "org-uuid-123");

    expect(payload.targetCompanyUniqueId).toBeUndefined();
    expect(payload.requestMode).toBe("individual_target");
  });
});


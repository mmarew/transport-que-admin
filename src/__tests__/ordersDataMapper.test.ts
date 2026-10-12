import { describe, it, expect } from "vitest";
import { mapBackendOrdersToDisplayItems, parseBatchBids } from "../pages/orders/ordersDataMapper";

describe("ordersDataMapper", () => {
  const dummyT = ((key: string) => key) as any;

  it("handles empty / undefined data safely", () => {
    const items = mapBackendOrdersToDisplayItems({
      ordersData: undefined,
      batchesData: undefined,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });
    expect(items).toEqual([]);
  });

  it("maps individual shipper request correctly", () => {
    const mockOrderPayload = {
      data: [
        {
          shipperRequestUniqueId: "req-123",
          shipperRequestId: 42,
          batchId: null,
          fullName: "Abebe Bikila",
          shippingCost: 35000,
          shippableItemQtyInQuintal: 10,
          originPlace: "Modjo Dry Port",
          destinationPlace: "Hawassa",
          isCompleted: false,
          journeyStatusId: 3,
          queueNumber: 7,
          loadingOrderNumber: "LO-99",
        },
      ],
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: mockOrderPayload,
      batchesData: null,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("req-123");
    expect(items[0].shipperRequestId).toBe(42);
    expect(items[0].displayId).toBe("#42");
    expect(items[0].shipper).toBe("Abebe Bikila");
    expect(items[0].cost).toBe(35000);
    expect(items[0].quintal).toBe(10);
    expect(items[0].journeyStatusId).toBe(3);
    expect(items[0].status).toBe("ongoing");
    expect(items[0].queueNumber).toBe(7);
    expect(items[0].loadingOrderNumber).toBe("LO-99");
  });

  it("decomposes multi-truck company target batch into individual truck slots", () => {
    const mockBatchesPayload = {
      data: [
        {
          batchId: 557,
          batchUniqueId: "batch-557-uuid",
          totalVehicles: 3,
          shippingCost: 90000,
          shippableItemQtyInQuintal: 300,
          shipperName: "Ethiopian Shipping Line",
          originPlace: "Addis Ababa",
          destinationPlace: "Djibouti",
          journeyStatusId: 3,
          journeyStatusName: "Accepted",
        },
      ],
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: null,
      batchesData: mockBatchesPayload,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(3);
    expect(items[0].id).toBe("batch-557-uuid-truck-1");
    expect(items[0].displayId).toBe("#557");
    expect(items[0].shipperRequestId).toBeNull();
    expect(items[0].cost).toBe(90000);
    expect(items[0].quintal).toBe(300);
    expect(items[0].batchTotalCost).toBe(270000);
    expect(items[0].batchTotalQuintal).toBe(900);
    expect(items[0].journeyStatusId).toBe(3); // First truck has active journey status

    expect(items[1].id).toBe("batch-557-uuid-truck-2");
    expect(items[1].displayId).toBe("#557");
    expect(items[1].shipperRequestId).toBeNull();
    expect(items[1].journeyStatusId).toBe(1); // Subsequent truck waits for driver assignment

    expect(items[2].id).toBe("batch-557-uuid-truck-3");
    expect(items[2].displayId).toBe("#557");
    expect(items[2].shipperRequestId).toBeNull();
    expect(items[2].journeyStatusId).toBe(1);
  });

  it("filters out deletedIds and overrides with editedOrders", () => {
    const mockOrderPayload = {
      data: [
        {
          shipperRequestUniqueId: "keep-1",
          shipperRequestId: 1,
          shippingCost: 20000,
        },
        {
          shipperRequestUniqueId: "delete-2",
          shipperRequestId: 2,
          shippingCost: 20000,
        },
      ],
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: mockOrderPayload,
      batchesData: null,
      deletedIds: new Set(["delete-2"]),
      editedOrders: {
        "keep-1": {
          id: "keep-1",
          shipper: "Overridden Name",
          cost: 99999,
        } as any,
      },
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("keep-1");
    expect(items[0].shipper).toBe("Overridden Name");
    expect(items[0].cost).toBe(99999);
  });

  it("extracts queueNumber and loadingOrderNumber from nested entry and avoids falling back to batchId", () => {
    const mockOrderPayload = {
      data: [
        {
          shipperRequestUniqueId: "f2e911d9-420e-4422-8b88-651389484e22",
          shipperRequestId: 4,
          batchId: 1,
          fullName: "Esmael Mohammed Hussen",
          entry: {
            queueNumber: 4,
            loadingOrderNumber: 4,
            status: 3,
          },
        },
      ],
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: mockOrderPayload,
      batchesData: null,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(1);
    expect(items[0].queueNumber).toBe(4);
    expect(items[0].loadingOrderNumber).toBe(4);
    expect(items[0].journeyStatusId).toBe(3);
  });

  it("extracts queueNumber: 4 and loadingOrderNumber: 4 from item.queue.entry when shipperRequestId is 3", () => {
    const mockOrderPayload = {
      data: [
        {
          shipperRequest: {
            shipperRequestId: 3,
            shipperRequestUniqueId: "f2e911d9-420e-4422-8b88-651389484e22",
            batchId: 1,
            phoneNumber: "+251910101010",
          },
          queue: {
            entry: {
              queueNumber: 4,
              loadingOrderNumber: 4,
              status: 8,
              fullName: "Esmael Mohammed Hussen",
              phoneNumber: "+251929257880",
            },
          },
          journey: {
            journeyStatusId: 8,
          },
        },
      ],
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: mockOrderPayload,
      batchesData: null,
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(1);
    expect(items[0].displayId).toBe("#1/3");
    expect(items[0].queueNumber).toBe(4);
    expect(items[0].loadingOrderNumber).toBe(4);
    expect(items[0].journeyStatusId).toBe(8);
  });

  it("does not duplicate company proposal rows when a company bid is accepted on a batch", () => {
    const mockBatch = {
      batchId: 1,
      batchUniqueId: "batch-1-uuid",
      targetCompanyName: "test",
      targetCompanyPhone: "+251910101010",
      targetCompanyUniqueId: "company-test-uuid",
      journeyStatusId: 4,
      status: "accepted",
      companyBids: [
        {
          companyBidRequestUniqueId: "bid-123",
          companyName: "test",
          phoneNumber: "+251910101010",
          userUniqueId: "company-test-uuid",
          status: "submitted",
          journeyStatusId: 1,
          offerCost: 5000,
        },
      ],
    };

    const bids = parseBatchBids(mockBatch);
    expect(bids).toHaveLength(1);
    expect(bids[0].fullName).toBe("test");
    expect(bids[0].journeyStatusId).toBe(4);
    expect(bids[0].journeyStatus).toBe("accepted");
    expect(bids[0].bidStatus).toBe("selected");
  });

  it("maps targeted company on batch awaiting bids to requested status without fake bid ID", () => {
    const mockBatch = {
      batchId: 4,
      batchUniqueId: "batch-4-uuid",
      targetCompanyName: "Alpha Transport",
      targetCompanyPhone: "+251911223344",
      targetCompanyUniqueId: "74fdaa52-05d2-4261-ae22-3945bc1757a4",
      journeyStatusId: 2,
      status: "requested",
      companyBids: [],
    };

    const bids = parseBatchBids(mockBatch);
    expect(bids).toHaveLength(1);
    expect(bids[0].fullName).toBe("Alpha Transport");
    expect(bids[0].journeyStatusId).toBe(2);
    expect(bids[0].journeyStatus).toBe("requested");
    expect(bids[0].bidStatus).toBe("requested");
    // Must be null: targetCompanyUniqueId must never be treated as a bid id!
    expect(bids[0].companyBidRequestUniqueId).toBeNull();
  });

  it("maps targeted company on batch with submitted company bid and assigns real bid id", () => {
    const mockBatch = {
      batchId: 4,
      batchUniqueId: "batch-4-uuid",
      targetCompanyName: "Alpha Transport",
      targetCompanyPhone: "+251911223344",
      targetCompanyUniqueId: "74fdaa52-05d2-4261-ae22-3945bc1757a4",
      journeyStatusId: 1,
      status: "submitted",
      companyBids: [
        {
          companyBidRequestUniqueId: "real-bid-uuid-123",
          companyUniqueId: "74fdaa52-05d2-4261-ae22-3945bc1757a4",
          proposedCostPerVehicle: 5000,
          bidStatus: "submitted",
        },
      ],
    };

    const bids = parseBatchBids(mockBatch);
    expect(bids).toHaveLength(1);
    expect(bids[0].fullName).toBe("Alpha Transport");
    expect(bids[0].journeyStatusId).toBe(1);
    expect(bids[0].journeyStatus).toBe("submitted");
    expect(bids[0].bidStatus).toBe("submitted");
    expect(bids[0].companyBidRequestUniqueId).toBe("real-bid-uuid-123");
  });

  it("does not mark submitted company proposals as accepted when batch has multiple bids", () => {
    const mockBatch = {
      batchId: 8,
      batchUniqueId: "batch-8-uuid",
      totalVehicles: 2,
      journeyStatusId: 1,
      status: "submitted",
      companyBids: [
        {
          companyBidRequestUniqueId: "bid-1",
          companyName: "test",
          phoneNumber: "+251929257891",
          userUniqueId: "company-test-uuid",
          bidStatus: "submitted",
          journeyStatusId: 1,
          proposedTotalCost: 1000,
        },
        {
          companyBidRequestUniqueId: "bid-2",
          companyName: "test",
          phoneNumber: "+251929257891",
          userUniqueId: "company-test-uuid",
          bidStatus: "submitted",
          journeyStatusId: 1,
          proposedTotalCost: 3000,
        },
        {
          companyBidRequestUniqueId: "bid-3",
          companyName: "test",
          phoneNumber: "+251929257891",
          userUniqueId: "company-test-uuid",
          bidStatus: "submitted",
          journeyStatusId: 1,
          proposedTotalCost: 5000,
        },
      ],
    };

    const bids = parseBatchBids(mockBatch);
    expect(bids).toHaveLength(3);
    for (const b of bids) {
      expect(b.journeyStatusId).toBe(1);
      expect(b.journeyStatus).toBe("submitted");
      expect(b.bidStatus).toBe("submitted");
    }
  });

  it("accurately maps batch #7 payload with acceptedOffer without inventing fake queue numbers or company phone", () => {
    const rawBatch7 = {
      batchId: 7,
      batchUniqueId: "d4833b0c-e012-4adf-898d-3ef12461c8c2",
      shipperUserUniqueId: "c66e63f6-777e-434c-8249-236c5cffc9f2",
      vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
      totalVehicles: 1,
      requestMode: "company_target",
      targetCompanyUniqueId: null,
      queueOrganizationUniqueId: "c4ceb8ba-1169-496e-8e83-90b9fe85b228",
      originLatitude: "11.08135830",
      originLongitude: "39.74087320",
      originPlace: "Kombolcha, South Wollo, Amhara Region, Ethiopia",
      destinationLatitude: "9.02200000",
      destinationLongitude: "38.74600000",
      destinationPlace: "Addis Ababa, Addis Ababa, Ethiopia",
      shippableItemName: "cement",
      shippableItemQtyInQuintal: "200.00",
      shippingDate: "2026-10-09T00:00:00.000Z",
      deliveryDate: "2026-10-09T00:00:00.000Z",
      shippingCost: "1000.00",
      isPodRequired: 1,
      batchCreatedBy: "806209fa-88d0-4df1-a9ef-619addf24f00",
      batchCreatedByRoleId: 11,
      journeyStatusId: 4,
      batchCreatedAt: "2026-10-09T12:51:26.000Z",
      batchUpdatedAt: "2026-10-09T12:55:26.000Z",
      batchDeletedAt: null,
      shipperName: null,
      shipperPhone: "+251929257890",
      vehicleTypeName: "20ft Container Truck (251–300 Quintal)",
      journeyStatusName: "acceptedByShipper",
      targetCompanyName: null,
      bidSummary: {
        total: 1,
        submitted: 0,
        accepted: 1,
        rejected: 0,
        cancelledByCompany: 0,
        expired: 0,
        joinedCompanyCount: 1,
      },
      acceptedOffer: {
        companyUniqueId: "6d63e8c4-dad6-40f5-a387-48e72c9cfcc8",
        companyName: "test",
        numberOfVehiclesOffered: 1,
        proposedCostPerVehicle: "1000.00",
        proposedTotalCost: "1000.00",
        bidStatusUpdatedAt: "2026-10-09T12:55:26.000Z",
      },
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: null,
      batchesData: { data: [rawBatch7] },
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.displayId).toBe("#7");
    expect(item.journeyStatusId).toBe(4);
    // Queue & loading numbers must be null when absent from API, NOT fake #7 from batchId fallback
    expect(item.queueNumber).toBeNull();
    expect(item.loadingOrderNumber).toBeNull();

    // Bids parsing must properly identify acceptedOffer as accepted (sid 4)
    const bids = parseBatchBids(rawBatch7);
    expect(bids).toHaveLength(1);
    expect(bids[0].fullName).toBe("test");
    expect(bids[0].journeyStatusId).toBe(4);
    expect(bids[0].journeyStatus).toBe("accepted");
    expect(bids[0].bidStatus).toBe("selected");
    // Company phone must NOT mistakenly be the shipper's phone
    expect(bids[0].phoneNumber).toBeNull();
  });

  it("correctly marks batch #7 as completed when live trip data is fetched from getShipperRequests", () => {
    const rawBatch7 = {
      batchId: 7,
      batchUniqueId: "d4833b0c-e012-4adf-898d-3ef12461c8c2",
      totalVehicles: 1,
      requestMode: "company_target",
      journeyStatusId: 4,
      journeyStatusName: "acceptedByShipper",
    };

    const postmanOrdersData = {
      data: [
        {
          assignmentUniqueId: "39fdbef1-0a36-4bed-95a1-5ffdc3a3f55e",
          assignmentStatus: "completed",
          shipperRequest: {
            shipperRequestUniqueId: "232da5fd-c91a-4fc3-b7c8-76e2ffd8c041",
            shipperRequestId: 16,
            originLatitude: "11.08135830",
            originLongitude: "39.74087320",
            originPlace: "Kombolcha, South Wollo, Amhara Region, Ethiopia",
            destinationLatitude: "9.02200000",
            destinationLongitude: "38.74600000",
            destinationPlace: "Addis Ababa, Addis Ababa, Ethiopia",
            shippableItemName: "cement",
            shippableItemQtyInQuintal: "200.00",
            shippingCost: "1000.00",
            vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
            shipperRequestBatchUniqueId: "d4833b0c-e012-4adf-898d-3ef12461c8c2",
            batchId: 7,
            requestMode: "company_target",
            journeyStatusId: 9,
          },
          driverRequests: [
            {
              driverRequestId: 7,
              driverRequestUniqueId: "9ff9a7cc-5226-43fe-9f04-f17d5012ccbd",
              vehicleUniqueId: "a93f90ad-46c4-4eca-9893-07f01e17eee7",
              fullName: "Esmael Mohammed Hussen",
              phoneNumber: "+251929257880",
              journeyStatusId: 9,
            },
          ],
          journey: {
            journeyUniqueId: "7259fa33-990b-4f55-a38b-d3fbbb892bf7",
            journeyStartedAt: "2026-10-09T13:03:51.000Z",
            journeyCompletedAt: "2026-10-09T13:03:57.000Z",
          },
        },
      ],
    };

    const items = mapBackendOrdersToDisplayItems({
      ordersData: postmanOrdersData,
      batchesData: { data: [rawBatch7] },
      deletedIds: new Set(),
      editedOrders: {},
      activeOrg: null,
      t: dummyT,
    });

    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.batchId).toBe(7);
    expect(item.journeyStatusId).toBe(9);
    expect(item.status).toBe("complete");
    expect(item.driverRequests).toHaveLength(1);
  });
});



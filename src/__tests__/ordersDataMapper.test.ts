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
});


import { describe, it, expect } from "vitest";
import { mapBackendOrdersToDisplayItems } from "../pages/orders/ordersDataMapper";

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
    expect(items[0].displayId).toBe("#557/1");
    expect(items[0].cost).toBe(30000);
    expect(items[0].quintal).toBe(100);
    expect(items[0].journeyStatusId).toBe(3); // First truck has active journey status

    expect(items[1].id).toBe("batch-557-uuid-truck-2");
    expect(items[1].displayId).toBe("#557/2");
    expect(items[1].journeyStatusId).toBe(1); // Subsequent truck waits for driver assignment

    expect(items[2].id).toBe("batch-557-uuid-truck-3");
    expect(items[2].displayId).toBe("#557/3");
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
});

import { describe, it, expect } from "vitest";
import {
  extractJourneyStatusId,
  getJourneyStatusName,
  formatJourneyStatusLabel,
  resolveJourneyStatus,
  mapJourneyStatusToQueueStatus,
  isDriverWaiting,
  JOURNEY_STATUS_NAMES,
  JOURNEY_STATUS_LABELS,
} from "../utils/journeyStatus";
import { getConnectedJourneyStatus, groupOrdersByBatch } from "../components/orders/OrdersTypes";
import type { OrderDisplayItem } from "../components/orders/OrdersTypes";

describe("Journey Status utility", () => {
  it("provides valid status name and label lookup maps", () => {
    expect(JOURNEY_STATUS_NAMES[1]).toBe("waiting");
    expect(JOURNEY_STATUS_LABELS[1]).toBe("Waiting");
    expect(JOURNEY_STATUS_NAMES[9]).toBe("journeyCompleted");
    expect(JOURNEY_STATUS_LABELS[9]).toBe("Journey Completed");
  });
  it("converts journeyStatusId to its canonical name string", () => {
    expect(getJourneyStatusName(1)).toBe("waiting");
    expect(getJourneyStatusName(2)).toBe("requested");
    expect(getJourneyStatusName(3)).toBe("acceptedByDriver");
    expect(getJourneyStatusName(9)).toBe("journeyCompleted");
  });

  it("converts journeyStatusId to human-readable label", () => {
    expect(formatJourneyStatusLabel(1)).toBe("Waiting");
    expect(formatJourneyStatusLabel(3)).toBe("Accepted by Driver");
    expect(formatJourneyStatusLabel(9)).toBe("Journey Completed");
  });

  it("never outputs [object Object] when object is passed", () => {
    const objWithId = { journeyStatusId: 3 };
    expect(getJourneyStatusName(objWithId)).toBe("acceptedByDriver");
    expect(formatJourneyStatusLabel(objWithId)).toBe("Accepted by Driver");

    const objWithName = { journeyStatusName: "acceptedByDriver" };
    expect(getJourneyStatusName(objWithName)).toBe("acceptedByDriver");
    expect(formatJourneyStatusLabel(objWithName)).toBe("Accepted by Driver");

    const unknownObj = {};
    expect(formatJourneyStatusLabel(unknownObj)).not.toBe("[object Object]");
    expect(formatJourneyStatusLabel(unknownObj)).toBe("Waiting");
  });

  it("extracts journeyStatusId from number, string, or object", () => {
    expect(extractJourneyStatusId(3)).toBe(3);
    expect(extractJourneyStatusId("3")).toBe(3);
    expect(extractJourneyStatusId("acceptedByDriver")).toBe(3);
    expect(extractJourneyStatusId({ journeyStatusId: 3 })).toBe(3);
    expect(extractJourneyStatusId({ id: 3 })).toBe(3);
  });

  it("resolves status to a simple journeyStatusId and journeyStatusName pair", () => {
    const res = resolveJourneyStatus(3);
    expect(res).toEqual({
      journeyStatusId: 3,
      journeyStatusName: "acceptedByDriver",
    });
  });

  it("correctly identifies waiting drivers", () => {
    expect(isDriverWaiting("waiting", 1)).toBe(true);
    expect(isDriverWaiting(undefined, 3)).toBe(false);
    expect(isDriverWaiting(undefined, { journeyStatusId: 1 })).toBe(true);
    expect(isDriverWaiting(undefined, { journeyStatusId: 9 })).toBe(false);
  });

  it("maps journeyStatus to simplified queue status", () => {
    expect(mapJourneyStatusToQueueStatus(1)).toBe("waiting");
    expect(mapJourneyStatusToQueueStatus(2)).toBe("offered");
    expect(mapJourneyStatusToQueueStatus(3)).toBe("offered");
    expect(mapJourneyStatusToQueueStatus(6)).toBe("loaded");
    expect(mapJourneyStatusToQueueStatus(9)).toBe("completed");
    expect(mapJourneyStatusToQueueStatus(10)).toBe("removed");
  });

  it("identifies connected journey statuses accurately", () => {
    const baseOrder: OrderDisplayItem = {
      id: "1",
      displayId: "#1",
      shipper: "Test Shipper",
      origin: "Addis Ababa",
      destination: "Hawassa",
      cost: 1000,
      quintal: 50,
      vehicleType: "ISUZU",
      item: "cement",
      type: "Individual" as const,
      status: "ongoing" as const,
    };

    // Open order with no drivers
    expect(getConnectedJourneyStatus(baseOrder)).toEqual({
      isConnected: false,
      label: "",
      type: "none",
    });

    // Completed order
    expect(getConnectedJourneyStatus({ ...baseOrder, status: "complete" })).toEqual({
      isConnected: true,
      statusId: 9,
      label: "Completed",
      type: "completed",
    });

    // In transit / Journey Started
    expect(getConnectedJourneyStatus({ ...baseOrder, journeyStatusId: 8 })).toEqual({
      isConnected: true,
      statusId: 8,
      label: "Journey Started",
      type: "journey-started",
    });

    // Loading / Loaded
    expect(getConnectedJourneyStatus({ ...baseOrder, journeyStatusId: 6 })).toEqual({
      isConnected: true,
      statusId: 6,
      label: "Loading",
      type: "loading",
    });
    expect(getConnectedJourneyStatus({ ...baseOrder, journeyStatusId: 7 })).toEqual({
      isConnected: true,
      statusId: 7,
      label: "Loaded",
      type: "loaded",
    });

    // Accepted via driverRequests list
    expect(
      getConnectedJourneyStatus({
        ...baseOrder,
        driverRequests: [
          { driverRequestId: 101, journeyStatusId: 4 },
        ],
      })
    ).toEqual({
      isConnected: true,
      statusId: 4,
      label: "Accepted",
      type: "accepted",
    });
  });

  it("groups orders by batch correctly", () => {
    const multiVehicleOrders: OrderDisplayItem[] = [
      {
        id: "req-618",
        shipperRequestId: 618,
        batchId: "503",
        displayId: "#503/618",
        shipper: "Dangote Cement",
        origin: "Mojo",
        destination: "Addis Ababa",
        cost: 10000,
        quintal: 200,
        vehicleType: "Heavy Truck",
        item: "Cement",
        type: "Group",
        status: "complete",
      },
      {
        id: "req-619",
        shipperRequestId: 619,
        batchId: "503",
        displayId: "#503/619",
        shipper: "Dangote Cement",
        origin: "Mojo",
        destination: "Addis Ababa",
        cost: 10000,
        quintal: 200,
        vehicleType: "Heavy Truck",
        item: "Cement",
        type: "Group",
        status: "complete",
      },
      {
        id: "req-620",
        shipperRequestId: 620,
        batchId: "503",
        displayId: "#503/620",
        shipper: "Dangote Cement",
        origin: "Mojo",
        destination: "Addis Ababa",
        cost: 10000,
        quintal: 200,
        vehicleType: "Heavy Truck",
        item: "Cement",
        type: "Group",
        status: "complete",
      },
      {
        id: "req-621",
        shipperRequestId: 621,
        batchId: "504",
        displayId: "#504/621",
        shipper: "National Cement",
        origin: "Dire Dawa",
        destination: "Harar",
        cost: 15000,
        quintal: 300,
        vehicleType: "Trailer",
        item: "Clinker",
        type: "Individual",
        status: "complete",
      },
    ];

    const groups = groupOrdersByBatch(multiVehicleOrders);
    expect(groups).toHaveLength(2);

    // First group: Batch 503 (3 trucks)
    const batch503 = groups[0];
    expect(batch503.isMultiVehicle).toBe(true);
    expect(batch503.totalVehicles).toBe(3);
    expect(batch503.displayId).toBe("#503");
    expect(batch503.totalCost).toBe(30000);
    expect(batch503.totalQuintal).toBe(600);
    expect(batch503.statusSummary.type).toBe("completed");
    expect(batch503.orders).toHaveLength(3);

    // Second group: Batch 504 (single truck)
    const batch504 = groups[1];
    expect(batch504.isMultiVehicle).toBe(false);
    expect(batch504.totalVehicles).toBe(1);
    expect(batch504.displayId).toBe("#504/621");
    expect(batch504.totalCost).toBe(15000);
    expect(batch504.totalQuintal).toBe(300);
  });
});


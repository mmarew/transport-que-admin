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

  it("should correctly calculate partial acceptance for a 5-truck batch (1 accepted, 4 waiting)", () => {
    const batch555Orders: OrderDisplayItem[] = [
      {
        id: "req-1",
        shipperRequestId: 101,
        batchId: "555",
        displayId: "#555/101",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 50,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
        journeyStatusId: 3, // Driver Accepted
      },
      {
        id: "req-2",
        shipperRequestId: 102,
        batchId: "555",
        displayId: "#555/102",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 50,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-3",
        shipperRequestId: 103,
        batchId: "555",
        displayId: "#555/103",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 50,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-4",
        shipperRequestId: 104,
        batchId: "555",
        displayId: "#555/104",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 50,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-5",
        shipperRequestId: 105,
        batchId: "555",
        displayId: "#555/105",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 50,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
    ];

    const groups = groupOrdersByBatch(batch555Orders);
    expect(groups).toHaveLength(1);

    const batch = groups[0];
    expect(batch.isMultiVehicle).toBe(true);
    expect(batch.totalVehicles).toBe(5);
    expect(batch.acceptedCount).toBe(1);
    expect(batch.waitingCount).toBe(4);
    expect(batch.statusSummary.isConnected).toBe(true);
    expect(batch.statusSummary.type).toBe("accepted");
    expect(batch.statusSummary.label).toBe("1/5 Driver Accepted · 4 Waiting");
  });

  it("should dynamically reflect Heading to Load stage and loading type for a 5-truck batch", () => {
    const batch555HeadingToLoad: OrderDisplayItem[] = [
      {
        id: "req-1",
        shipperRequestId: 682,
        batchId: "555",
        displayId: "#555/682",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 220,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-2",
        shipperRequestId: 681,
        batchId: "555",
        displayId: "#555/681",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 220,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-3",
        shipperRequestId: 680,
        batchId: "555",
        displayId: "#555/680",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 220,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-4",
        shipperRequestId: 679,
        batchId: "555",
        displayId: "#555/679",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 220,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
      },
      {
        id: "req-5",
        shipperRequestId: 678,
        batchId: "555",
        displayId: "#555/678",
        shipper: "Valued Shipper",
        origin: "Dessie",
        destination: "Kombolcha",
        cost: 1000,
        quintal: 220,
        vehicleType: "20ft Container Truck",
        item: "cement",
        type: "Individual",
        status: "ongoing",
        journeyStatusId: 5, // Heading to Load
      },
    ];

    const groups = groupOrdersByBatch(batch555HeadingToLoad);
    expect(groups).toHaveLength(1);

    const batch = groups[0];
    expect(batch.isMultiVehicle).toBe(true);
    expect(batch.totalVehicles).toBe(5);
    expect(batch.acceptedCount).toBe(1);
    expect(batch.waitingCount).toBe(4);
    expect(batch.statusStageLabel).toBe("Heading to Load");
    expect(batch.statusSummary.isConnected).toBe(true);
    expect(batch.statusSummary.type).toBe("loading");
    expect(batch.statusSummary.label).toBe("1/5 Heading to Load · 4 Waiting");
  });

  it("correctly groups company_target multi-vehicle batch #557 with 15 trucks and total cost/quintals", () => {
    const batch557Items: OrderDisplayItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `batch-557-truck-${i + 1}`,
      shipperRequestId: i + 1,
      batchId: "557",
      displayId: `#557/${i + 1}`,
      shipper: "+251922112485",
      origin: "Kombolcha, Ethiopia",
      destination: "Dessie, Ethiopia",
      cost: 4511939.33,
      quintal: 33.33,
      vehicleType: "20ft Container Truck (251–300 Quintal)",
      item: "Constraction Materials",
      type: "Group",
      status: "ongoing",
      journeyStatusId: 1,
      totalVehicles: 15,
      batchTotalCost: 67679090,
      batchTotalQuintal: 500,
    }));

    const groups = groupOrdersByBatch(batch557Items);
    expect(groups).toHaveLength(1);

    const g = groups[0];
    expect(g.batchId).toBe("557");
    expect(g.displayId).toBe("#557");
    expect(g.type).toBe("Group");
    expect(g.isMultiVehicle).toBe(true);
    expect(g.totalVehicles).toBe(15);
    expect(g.totalCost).toBe(67679090);
    expect(g.totalQuintal).toBe(500);
    expect(g.acceptedCount).toBe(0);
    expect(g.waitingCount).toBe(15);
  });

  it("correctly handles company_target single-vehicle batch #553", () => {
    const batch553Item: OrderDisplayItem = {
      id: "d15e7a6c-2ac8-43f1-8055-715650ecb71e",
      shipperRequestId: null,
      batchId: "553",
      displayId: "#553",
      shipper: "+251929257890",
      origin: "Dessie, South Wollo, Amhara Region, Ethiopia",
      destination: "Kombolcha, South Wollo, Amhara Region, Ethiopia",
      cost: 10000,
      quintal: 220,
      vehicleType: "20ft Container Truck (251–300 Quintal)",
      item: "cement",
      type: "Group",
      status: "ongoing",
      journeyStatusId: 1,
      totalVehicles: 1,
      batchTotalCost: 10000,
      batchTotalQuintal: 220,
    };

    const groups = groupOrdersByBatch([batch553Item]);
    expect(groups).toHaveLength(1);

    const g = groups[0];
    expect(g.batchId).toBe("553");
    expect(g.displayId).toBe("#553");
    expect(g.type).toBe("Group");
    expect(g.isMultiVehicle).toBe(false);
    expect(g.totalVehicles).toBe(1);
    expect(g.totalCost).toBe(10000);
    expect(g.totalQuintal).toBe(220);
  });

  it("accurately handles 1 completed truck and 14 accepted trucks in a 15-truck batch without mislabeling as 15/15 Completed", () => {
    // 1 completed truck + 14 accepted trucks
    const batch557Mixed: OrderDisplayItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `req-557-${i + 1}`,
      shipperRequestId: 700 + i,
      batchId: "557",
      displayId: `#557/${700 + i}`,
      shipper: "Valued Shipper",
      origin: "Kombolcha",
      destination: "Dessie",
      cost: 67679090 / 15,
      quintal: 500,
      vehicleType: "20ft Container Truck",
      item: "Constraction Materials",
      type: "Group",
      // Truck 1 is completed (statusId: 9)
      // Trucks 2-15 are accepted (statusId: 4)
      status: i === 0 ? "complete" : "ongoing",
      journeyStatusId: i === 0 ? 9 : 4,
      driverRequests: [
        {
          id: `dr-${i + 1}`,
          driverUserUniqueId: `drv-${i + 1}`,
          journeyStatusId: i === 0 ? 9 : 4,
          driverUser: {
            fullName: `Driver ${i + 1}`,
            phoneNumber: `+25191100000${i}`,
          },
        },
      ],
      totalVehicles: 15,
      batchTotalCost: 67679090,
      batchTotalQuintal: 500,
    }));

    const groups = groupOrdersByBatch(batch557Mixed);
    expect(groups).toHaveLength(1);

    const g = groups[0];
    expect(g.batchId).toBe("557");
    expect(g.totalVehicles).toBe(15);
    expect(g.completedCount).toBe(1);
    expect(g.activeCount).toBe(14);
    expect(g.waitingCount).toBe(0);
    expect(g.acceptedCount).toBe(15);

    // Active label reflects ongoing trucks:
    expect(g.statusSummary.isConnected).toBe(true);
    expect(g.statusSummary.label).toBe("14 Accepted");
    expect(g.statusSummary.type).toBe("accepted");

    // Must NOT be marked as complete batch (since 14 trucks are still active!)
    const isBatchComplete = g.totalVehicles > 0 && g.completedCount === g.totalVehicles;
    expect(isBatchComplete).toBe(false);
  });

  it("accurately handles 1 completed, 2 loading, and 2 waiting in a 5-truck batch", () => {
    const batch5Mixed: OrderDisplayItem[] = [
      {
        id: "req-1",
        shipperRequestId: 101,
        batchId: "600",
        displayId: "#600/101",
        shipper: "Shipper A",
        origin: "A",
        destination: "B",
        cost: 1000,
        quintal: 100,
        vehicleType: "Truck",
        item: "Items",
        type: "Group",
        status: "complete",
        journeyStatusId: 9,
      },
      {
        id: "req-2",
        shipperRequestId: 102,
        batchId: "600",
        displayId: "#600/102",
        shipper: "Shipper A",
        origin: "A",
        destination: "B",
        cost: 1000,
        quintal: 100,
        vehicleType: "Truck",
        item: "Items",
        type: "Group",
        status: "ongoing",
        journeyStatusId: 6, // Loading
      },
      {
        id: "req-3",
        shipperRequestId: 103,
        batchId: "600",
        displayId: "#600/103",
        shipper: "Shipper A",
        origin: "A",
        destination: "B",
        cost: 1000,
        quintal: 100,
        vehicleType: "Truck",
        item: "Items",
        type: "Group",
        status: "ongoing",
        journeyStatusId: 6, // Loading
      },
      {
        id: "req-4",
        shipperRequestId: 104,
        batchId: "600",
        displayId: "#600/104",
        shipper: "Shipper A",
        origin: "A",
        destination: "B",
        cost: 1000,
        quintal: 100,
        vehicleType: "Truck",
        item: "Items",
        type: "Group",
        status: "ongoing",
        // waiting (no driver)
      },
      {
        id: "req-5",
        shipperRequestId: 105,
        batchId: "600",
        displayId: "#600/105",
        shipper: "Shipper A",
        origin: "A",
        destination: "B",
        cost: 1000,
        quintal: 100,
        vehicleType: "Truck",
        item: "Items",
        type: "Group",
        status: "ongoing",
        // waiting (no driver)
      },
    ];

    const groups = groupOrdersByBatch(batch5Mixed);
    expect(groups).toHaveLength(1);

    const g = groups[0];
    expect(g.totalVehicles).toBe(5);
    expect(g.completedCount).toBe(1);
    expect(g.activeCount).toBe(2);
    expect(g.waitingCount).toBe(2);
    expect(g.statusSummary.label).toBe("2 Loading · 2 Waiting");
    expect(g.statusSummary.type).toBe("loading");
  });

  it("marks batch as 15/15 Completed only when all 15 trucks have completed", () => {
    const batch557AllCompleted: OrderDisplayItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `req-557-${i + 1}`,
      shipperRequestId: 700 + i,
      batchId: "557",
      displayId: `#557/${700 + i}`,
      shipper: "Valued Shipper",
      origin: "Kombolcha",
      destination: "Dessie",
      cost: 1000,
      quintal: 50,
      vehicleType: "20ft Container Truck",
      item: "Constraction Materials",
      type: "Group",
      status: "complete",
      journeyStatusId: 9,
      totalVehicles: 15,
    }));

    const groups = groupOrdersByBatch(batch557AllCompleted);
    const g = groups[0];
    expect(g.completedCount).toBe(15);
    expect(g.activeCount).toBe(0);
    expect(g.waitingCount).toBe(0);
    expect(g.statusSummary.label).toBe("Completed");
    expect(g.statusSummary.type).toBe("completed");

    const isBatchComplete = g.totalVehicles > 0 && g.completedCount === g.totalVehicles;
    expect(isBatchComplete).toBe(true);
  });

  it("ensures partially completed batch appears in both Ongoing tab and Complete tab as a group", () => {
    // 15 trucks total: 1 completed, 14 accepted
    const batch557Mixed: OrderDisplayItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `req-557-${i + 1}`,
      shipperRequestId: 700 + i,
      batchId: "557",
      displayId: `#557/${700 + i}`,
      shipper: "Valued Shipper",
      origin: "Kombolcha",
      destination: "Dessie",
      cost: 1000,
      quintal: 50,
      vehicleType: "20ft Container Truck",
      item: "Constraction Materials",
      type: "Group",
      status: i === 0 ? "complete" : "ongoing",
      journeyStatusId: i === 0 ? 9 : 4,
      totalVehicles: 15,
    }));

    // In ONGOING tab: Only ongoing orders are kept
    const ongoingOrders = batch557Mixed.filter(
      (o) => getConnectedJourneyStatus(o).type !== "completed"
    );
    const ongoingBatches = groupOrdersByBatch(ongoingOrders);
    expect(ongoingBatches).toHaveLength(1);
    expect(ongoingBatches[0].batchId).toBe("557");
    expect(ongoingBatches[0].statusSummary.label).toBe("14 Accepted");
    expect(ongoingBatches[0].orders).toHaveLength(14);
    expect(ongoingBatches[0].orders.every((o) => o.status === "ongoing")).toBe(true);

    // In COMPLETE tab: Only completed orders are kept
    const completeOrders = batch557Mixed.filter(
      (o) => getConnectedJourneyStatus(o).type === "completed"
    );
    const completeBatches = groupOrdersByBatch(completeOrders);
    expect(completeBatches).toHaveLength(1);
    expect(completeBatches[0].batchId).toBe("557");
    expect(completeBatches[0].statusSummary.label).toBe("Completed");
    expect(completeBatches[0].statusSummary.type).toBe("completed");
    expect(completeBatches[0].orders).toHaveLength(1);
    expect(completeBatches[0].orders[0].id).toBe("req-557-1");
  });

  it("handles multi-truck batches with 0 accepted drivers and 0 bids as waiting", () => {
    const baseOrder: OrderDisplayItem = {
      id: "1",
      displayId: "#1",
      shipper: "Test Shipper",
      origin: "Dessie",
      destination: "Kombolcha",
      cost: 1000,
      quintal: 67.33,
      vehicleType: "Container Truck",
      item: "coffee",
      type: "Group" as const,
      status: "ongoing" as const,
    };

    const batchOrders: OrderDisplayItem[] = Array.from({ length: 3 }, (_, i) => ({
      ...baseOrder,
      id: `req-558-${i + 1}`,
      shipperRequestId: 5580 + i,
      batchId: "558",
      status: "ongoing",
      isBiddingApproved: true,
      totalVehicles: 3,
      driverRequests: [],
    }));

    const batches = groupOrdersByBatch(batchOrders);
    expect(batches).toHaveLength(1);
    expect(batches[0].batchId).toBe("558");
    expect(batches[0].isMultiVehicle).toBe(true);
    expect(batches[0].totalVehicles).toBe(3);
    expect(batches[0].acceptedCount).toBe(0);
    expect(batches[0].waitingCount).toBe(3);
    expect(batches[0].statusSummary.isConnected).toBe(false);
    expect(batches[0].isBiddingApproved).toBe(true);
  });
});



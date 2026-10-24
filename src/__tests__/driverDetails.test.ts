import { describe, it, expect } from "vitest";
import { buildDriverDetailsModel } from "../pages/orders/driver-details/driverDetailsMapper";
import type { OrderDisplayItem } from "../components/orders/OrdersTypes";
import { isDriverConnectedToOrder } from "../components/orders/OrdersTypes";

describe("Driver Details Mapper with Precise Real Data", () => {
  it("builds safe default driver details model when order is null without mock fallbacks", () => {
    const model = buildDriverDetailsModel(null, null);

    expect(model.orderNumber).toBe("1");
    expect(model.driverName).toBe("Awaiting Driver Assignment");
    expect(model.isDriverAssigned).toBe(false);
    expect(model.route.origin).toBe("Terminal");
    expect(model.route.destination).toBe("Destination");
    expect(model.commodity).toBe("General Cargo");
    expect(model.vehicle.plateNumber).toBe("Pending assignment");
    expect(model.vehicle.fleetId).toBe("—");
    expect(model.vehicle.insuranceExpiry).toBe("—");
    expect(model.vehicle.lastInspection).toBe("—");
    expect(model.vehicle.status).toBe("Pending");
    expect(model.licence.number).toBe("Pending assignment");
    expect(model.licence.validUntil).toBe("—");
    expect(model.licence.experienceYears).toBe("—");
    expect(model.licence.isVerified).toBe(false);
    expect(model.timeline).toHaveLength(5);
  });

  it("extracts precise real order data for assigned driver, route, commodity, and costs", () => {
    const mockOrder: OrderDisplayItem = {
      id: "req-999",
      batchId: 558,
      shipperRequestId: 12,
      displayId: "#558/12",
      shipper: "National Cement Corp",
      type: "Group",
      vehicleType: "Sinotruk Container",
      item: "Cement Bags",
      origin: "Dessie Yard, Amhara",
      destination: "Kombolcha Dry Port",
      originLatitude: 11.13,
      originLongitude: 39.63,
      destinationLatitude: 11.08,
      destinationLongitude: 39.73,
      quintal: 300,
      cost: 15000,
      batchTotalCost: 45000,
      totalVehicles: 3,
      status: "ongoing",
      journeyStatusId: 8,
      queueNumber: 7,
      driverRequests: [
        {
          fullName: "Kebede Michael",
          phoneNumber: "+251911223344",
          plateNumber: "ET-3-99881",
          userUniqueId: "user-drv-007",
          journeyStatusId: 8,
          driverId: 7,
        },
      ],
    };

    const mockOrg = {
      queueOrganizationName: "Cement Factory",
      queueOrganizationAddress: "Addis Ababa, Bole",
      queueOrganizationPhone: "+251929257890",
    };

    const model = buildDriverDetailsModel(mockOrder, mockOrg);

    expect(model.orderNumber).toBe("558/12");
    expect(model.orderIdDisplay).toBe("#558/12");
    expect(model.driverName).toBe("Kebede Michael");
    expect(model.isDriverAssigned).toBe(true);
    expect(model.driverInitials).toBe("KM");
    expect(model.driverPhone).toBe("+251911223344");
    expect(model.driverId).toBe("DR-007");
    expect(model.vehicle.plateNumber).toBe("ET-3-99881");
    expect(model.vehicle.type).toBe("Sinotruk Container");
    expect(model.commodity).toBe("Cement Bags");
    expect(model.totalCost).toBe(45000);
    expect(model.costDisplay).toBe("45,000 ETB");
    expect(model.transportCost).toBe(42750);
    expect(model.handlingCost).toBe(2250);
    expect(model.singleCost).toBe(15000);
    expect(model.singleCostDisplay).toBe("15,000 ETB");
    expect(model.singleTransportCost).toBe(14250);
    expect(model.singleHandlingCost).toBe(750);
    expect(model.weightDisplay).toBe("30 ton (300 quintal)");
    expect(model.dispatch.orgName).toBe("Cement Factory");
    expect(model.dispatch.orgCity).toBe("Addis Ababa");
    expect(model.dispatch.contactPhone).toBe("+251929257890");
    expect(model.route.origin).toBe("Dessie Yard");
    expect(model.route.destination).toBe("Kombolcha Dry Port");
    expect(model.route.corridor).toBe("A2 corridor");
  });

  it("extracts precise nested real vehicle and licence data from backend payload", () => {
    const mockOrderWithVehicle: OrderDisplayItem = {
      id: "req-102",
      batchId: 991,
      shipperRequestId: 1,
      displayId: "#991/1",
      shipper: "Freight Ethiopia",
      type: "Individual",
      vehicleType: "Heavy Freight Truck",
      item: "Steel Rods",
      origin: "Mojo",
      destination: "Hawassa",
      quintal: 150,
      cost: 50000,
      status: "ongoing",
      journeyStatusId: 4,
      driverRequests: [
        {
          fullName: "Solomon Tadesse",
          phoneNumber: "+251911998877",
          journeyStatusId: 4,
          vehicleOfDriver: {
            licensePlate: "ET-4-77112",
            makeModel: "Volvo FH16",
            fleetVehicleId: "FLT-9002",
            insuranceExpiryDate: "2027-05-15T00:00:00Z",
            lastInspectionDate: "2026-02-10T00:00:00Z",
            status: "Active",
          },
          rawDriver: {
            drivingLicense: "DL-ETH-88291",
            licenseClass: "Grade 5 Heavy Vehicle",
            licenseIssuedBy: "Addis Ababa Transport Bureau",
            licenseExpiryDate: "2029-08-20T00:00:00Z",
            drivingExperience: 12,
            emergencyContact: "+251922334455",
          },
        } as any,
      ],
    };

    const model = buildDriverDetailsModel(mockOrderWithVehicle, null);

    // Vehicle details card assertions
    expect(model.vehicle.plateNumber).toBe("ET-4-77112");
    expect(model.vehicle.makeModel).toBe("Volvo FH16");
    expect(model.vehicle.fleetId).toBe("FLT-9002");
    expect(model.vehicle.insuranceExpiry).toBe("15 May 2027");
    expect(model.vehicle.lastInspection).toBe("10 Feb 2026 · Passed");
    expect(model.vehicle.status).toBe("Active");

    // Driving licence card assertions
    expect(model.licence.number).toBe("DL-ETH-88291");
    expect(model.licence.licenceClass).toBe("Grade 5 Heavy Vehicle");
    expect(model.licence.issuedBy).toBe("Addis Ababa Transport Bureau");
    expect(model.licence.validUntil).toBe("20 Aug 2029");
    expect(model.licence.experienceYears).toBe("12 years");
    expect(model.licence.emergencyContact).toBe("+251922334455");
    expect(model.licence.isVerified).toBe(true);
  });

  it("extracts real vehicle plate and color from directoryData if driver is registered", () => {
    const mockOrder: OrderDisplayItem = {
      id: "req-dir-test",
      batchId: 777,
      shipperRequestId: 1,
      shipper: "Logistics Hub",
      type: "Individual",
      vehicleType: "Isuzu FSR",
      item: "Electronics",
      origin: "Addis Ababa",
      destination: "Adama",
      quintal: 40,
      cost: 12000,
      status: "ongoing",
      driverRequests: [
        {
          fullName: "Dawit Haile",
          phoneNumber: "+251911445566",
          vehicleDriverUniqueId: "vd-uuid-5555",
        } as any,
      ],
    };

    const directoryData = {
      data: [
        {
          vehicleDriverUniqueId: "vd-uuid-5555",
          licensePlate: "ET-3-88229",
          vehicleUniqueId: "veh-uuid-9999",
          color: "White",
          fullName: "Dawit Haile",
          phoneNumber: "+251911445566",
        },
      ],
    };

    const model = buildDriverDetailsModel(mockOrder, null, null, { directoryData });

    expect(model.vehicle.plateNumber).toBe("ET-3-88229");
    expect(model.vehicle.makeModel).toBe("White Commercial Vehicle");
    expect(model.vehicle.fleetId).toBe("Not recorded");
  });

  it("displays authentic 'Not recorded' indicators when vehicle or license fields are not provided in backend", () => {
    const bareOrder: OrderDisplayItem = {
      id: "req-bare",
      batchId: 303,
      shipperRequestId: 1,
      shipper: "Bare Shipper",
      type: "Individual",
      vehicleType: "Standard Truck",
      item: "Goods",
      origin: "Addis Ababa",
      destination: "Hawassa",
      quintal: 25,
      cost: 15000,
      status: "ongoing",
      driverRequests: [
        {
          fullName: "Ali Mohammed",
          phoneNumber: "+251911122233",
        },
      ],
    };

    const model = buildDriverDetailsModel(bareOrder, null);

    // Should NOT have fake values like "Sinotruk HOWO · 2021", "31 Dec 2026", "DL-ET-048291"
    expect(model.vehicle.makeModel).toBe("Not recorded");
    expect(model.vehicle.plateNumber).toBe("Not recorded");
    expect(model.vehicle.insuranceExpiry).toBe("Not recorded");
    expect(model.vehicle.lastInspection).toBe("Not recorded");
    expect(model.licence.number).toBe("Not recorded");
    expect(model.licence.validUntil).toBe("Not recorded");
    expect(model.licence.isVerified).toBe(true);
    expect(model.driverId).toBe("");
  });

  it("calculates real route corridor and distance between known Ethiopian cities", () => {
    const mockOrder: OrderDisplayItem = {
      id: "ord-mojo-hawassa",
      batchId: 42,
      shipperRequestId: 1,
      displayId: "#42/1",
      shipper: "Oromia Coffee Farmers Coop",
      type: "Group",
      vehicleType: "40ft Container Truck",
      item: "Export Grade Coffee",
      origin: "Mojo Dry Port",
      destination: "Hawassa Industrial Park",
      quintal: 500,
      cost: 65000,
      totalVehicles: 2,
      status: "ongoing",
      journeyStatusId: 8,
      driverRequests: [
        {
          fullName: "Abebe Mekonnen",
          phoneNumber: "+251912345678",
          plateNumber: "ET - 3-04582",
          userUniqueId: "DR-001",
          journeyStatusId: 8,
        },
      ],
    };

    const model = buildDriverDetailsModel(mockOrder, null);

    expect(model.route.origin).toBe("Mojo Dry Port");
    expect(model.route.destination).toBe("Hawassa Industrial Park");
    expect(model.route.corridor).toBe("A7 Expressway corridor");
    expect(model.totalDistanceKm).toBeGreaterThan(160);
    expect(model.totalDistanceKm).toBeLessThan(210);
    expect(model.commodity).toBe("Export Grade Coffee");
    expect(model.weightDisplay).toBe("50 ton (500 quintal)");
  });

  it("handles unassigned orders waiting for bids cleanly without fake drivers", () => {
    const orderWaiting: OrderDisplayItem = {
      id: "ord-waiting",
      batchId: 101,
      shipperRequestId: 2,
      displayId: "#101/2",
      shipper: "Habesha Breweries",
      phone: "+251944556677",
      type: "Individual",
      vehicleType: "Dry Cargo Truck",
      item: "Malt Bags",
      origin: "Debre Birhan",
      destination: "Addis Ababa",
      quintal: 80,
      cost: 20000,
      status: "ongoing",
      journeyStatusId: 1,
      driverRequests: [],
    };

    const model = buildDriverDetailsModel(orderWaiting, null);
    expect(model.isDriverAssigned).toBe(false);
    expect(model.driverName).toBe("Awaiting Driver Assignment");
    expect(model.driverStatus.label).toBe("Awaiting Driver");
    expect(model.progressPercentage).toBe(0);
    expect(model.commodity).toBe("Malt Bags");
    expect(model.costDisplay).toBe("20,000 ETB");
  });

  it("maps journey statuses dynamically (5 -> Heading to load, 7 -> Loaded, 9 -> Completed)", () => {
    const baseOrder: OrderDisplayItem = {
      id: "ord-status",
      shipper: "Test Shipper",
      type: "Individual",
      vehicleType: "Truck",
      item: "Goods",
      origin: "Addis Ababa",
      destination: "Adama",
      quintal: 10,
      cost: 5000,
      status: "ongoing",
      driverRequests: [
        {
          fullName: "Driver Dawit",
          phoneNumber: "+251911002233",
          journeyStatusId: 5,
        },
      ],
    };

    const modelHeading = buildDriverDetailsModel({ ...baseOrder, journeyStatusId: 5 }, null);
    expect(modelHeading.driverStatus.label).toBe("Heading to load");
    expect(modelHeading.progressPercentage).toBe(15);

    const modelLoaded = buildDriverDetailsModel({ ...baseOrder, journeyStatusId: 7 }, null);
    expect(modelLoaded.driverStatus.label).toBe("Loaded");
    expect(modelLoaded.progressPercentage).toBe(35);

    const modelCompleted = buildDriverDetailsModel({ ...baseOrder, journeyStatusId: 9 }, null);
    expect(modelCompleted.driverStatus.label).toBe("Completed");
    expect(modelCompleted.progressPercentage).toBe(100);
  });

  it("extracts 100% authentic live tracking data and coordinates from completed driver payload", () => {
    const rawCompletedItem = {
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
          userUniqueId: "136795bd-fff3-49d2-a22f-230a87388eb8",
          originLatitude: "11.08135830",
          originLongitude: "39.74087320",
          originPlace: "Kombolcha, South Wollo, Amhara Region, Ethiopia",
          journeyStatusId: 9,
          vehicleOfDriver: {
            licensePlate: "101010",
            vehicleTypeUniqueId: "6f5d559f-8a4d-4106-83da-eb5f42751200",
            vehicleTypeName: "20ft Container Truck (251–300 Quintal)",
            color: "Black",
          },
        },
      ],
      decisions: [
        {
          journeyDecisionUniqueId: "096b220f-5a96-4854-8ef4-897677a0a6a1",
          driverRequestId: 7,
          journeyStatusId: 9,
          decisionTime: "2026-10-09T12:56:55.000Z",
          decisionBy: "company",
        },
      ],
      journey: {
        journeyUniqueId: "7259fa33-990b-4f55-a38b-d3fbbb892bf7",
        journeyDecisionUniqueId: "096b220f-5a96-4854-8ef4-897677a0a6a1",
        journeyStartedAt: "2026-10-09T13:03:51.000Z",
        journeyCompletedAt: "2026-10-09T13:03:57.000Z",
      },
    };

    const mockOrder: OrderDisplayItem = {
      id: "232da5fd-c91a-4fc3-b7c8-76e2ffd8c041",
      batchId: 7,
      shipperRequestId: 16,
      displayId: "#7/16",
      shipper: "National Shipper",
      type: "Group",
      vehicleType: "20ft Container Truck (251–300 Quintal)",
      item: "cement",
      origin: "Kombolcha, South Wollo, Amhara Region, Ethiopia",
      destination: "Addis Ababa, Addis Ababa, Ethiopia",
      originLatitude: 11.0813583,
      originLongitude: 39.7408732,
      destinationLatitude: 9.022,
      destinationLongitude: 38.746,
      plateNumber: "101010",
      quintal: 200,
      cost: 1000,
      status: "complete",
      journeyStatusId: 9,
      driverRequests: rawCompletedItem.driverRequests,
      rawItem: rawCompletedItem,
    };

    const model = buildDriverDetailsModel(mockOrder, null);

    // Profile & Driver ID (when backend has no driverId, must be empty string)
    expect(model.driverName).toBe("Esmael Mohammed Hussen");
    expect(model.driverPhone).toBe("+251929257880");
    expect(model.driverId).toBe("");

    // Vehicle specs
    expect(model.vehicle.plateNumber).toBe("101010");
    expect(model.vehicle.makeModel).toBe("Black Commercial Vehicle");

    // Geographic Coordinates & Corridor
    expect(model.route.origin).toBe("Kombolcha");
    expect(model.route.destination).toBe("Addis Ababa");
    expect(model.route.corridor).toBe("A2 corridor");
    expect(model.route.originCoordinates.lat).toBeCloseTo(11.0813, 3);
    expect(model.route.originCoordinates.lng).toBeCloseTo(39.7408, 3);
    expect(model.route.destinationCoordinates.lat).toBeCloseTo(9.022, 3);
    expect(model.route.destinationCoordinates.lng).toBeCloseTo(38.746, 3);

    // Status & Completed metrics
    expect(model.driverStatus.label).toBe("Completed");
    expect(model.progressPercentage).toBe(100);
    expect(model.remainingDistanceKm).toBe(0);
    expect(model.speedKmh).toBe(0);

    // Timeline checks
    expect(model.timeline[3].status).toBe("completed");
    expect(model.timeline[4].status).toBe("completed");
    expect(model.timeline[4].title).toBe("Delivery confirmed");

    // Payment status for completed order
    expect(model.dispatch.paymentStatus).toBe("Paid");
  });

  it("extracts plate number, insurance valid until, and licence valid until from backend account status payload", () => {
    const rawAccountStatus = {
      message: "Account status fetched",
      messageType: "accountStatus",
      vehicle: {
        vehicleDriverId: 1,
        vehicleDriverUniqueId: "290545c7-7d7d-4113-8066-452784407e66",
        vehicleUniqueId: "a93f90ad-46c4-4eca-9893-07f01e17eee7",
        driverUserUniqueId: "136795bd-fff3-49d2-a22f-230a87388eb8",
        assignmentStatus: "active",
        licensePlate: "101010",
        color: "Black",
        vehicleTypeId: 6,
        vehicleTypeName: "20ft Container Truck (251–300 Quintal)",
        fullName: "Esmael Mohammed Hussen",
        phoneNumber: "+251929257880",
      },
      userData: {
        userUniqueId: "136795bd-fff3-49d2-a22f-230a87388eb8",
        roleId: 2,
        fullName: "Esmael Mohammed Hussen",
        phoneNumber: "+251929257880",
        statusName: "active",
      },
      attachedDocumentsByStatus: {
        PENDING: [],
        ACCEPTED: [
          {
            attachedDocumentId: 15,
            documentTypeName: "Driver’s License",
            uploadedDocumentName: "driversLicense",
            attachedDocumentFileNumber: "5678",
            documentExpirationDate: "2028-09-30T21:00:00.000Z",
            attachedDocumentAcceptance: "ACCEPTED",
          },
          {
            attachedDocumentId: 17,
            documentTypeName: "Insurance Document",
            uploadedDocumentName: "insuranceDocument",
            attachedDocumentFileNumber: "34",
            documentExpirationDate: "2030-09-30T21:00:00.000Z",
            attachedDocumentAcceptance: "ACCEPTED",
          },
          {
            attachedDocumentId: 18,
            documentTypeName: " Vehicle Registration (librea)",
            uploadedDocumentName: "VehicleRegistrationLibrea",
            attachedDocumentFileNumber: "1010",
            attachedDocumentAcceptance: "ACCEPTED",
          },
        ],
        REJECTED: [],
      },
      status: 1,
      reason: "All requirements satisfied",
    };

    const mockOrder: OrderDisplayItem = {
      id: "ord-account-status-test",
      batchId: 7,
      shipperRequestId: 16,
      displayId: "#7/16",
      shipper: "National Shipper",
      type: "Group",
      vehicleType: "20ft Container Truck (251–300 Quintal)",
      item: "Cement",
      origin: "Kombolcha",
      destination: "Addis Ababa",
      quintal: 200,
      cost: 1000,
      status: "ongoing",
      driverRequests: [
        {
          fullName: "Esmael Mohammed Hussen",
          phoneNumber: "+251929257880",
          userUniqueId: "136795bd-fff3-49d2-a22f-230a87388eb8",
          journeyStatusId: 8,
        },
      ],
    };

    const model = buildDriverDetailsModel(mockOrder, null, null, {
      accountStatusData: rawAccountStatus,
    });

    expect(model.driverName).toBe("Esmael Mohammed Hussen");
    expect(model.driverPhone).toBe("+251929257880");
    // Plate number
    expect(model.vehicle.plateNumber).toBe("101010");
    // Vehicle specs
    expect(model.vehicle.type).toBe("20ft Container Truck (251–300 Quintal)");
    expect(model.vehicle.makeModel).toBe("Black Commercial Vehicle");
    // Insurance valid until
    expect(model.vehicle.insuranceExpiry).toBe("01 Oct 2030");
    // Driver licence valid until and licence number
    expect(model.licence.validUntil).toBe("01 Oct 2028");
    expect(model.licence.number).toBe("5678");
    expect(model.licence.isVerified).toBe(true);
  });

  it("correctly identifies whether driver is connected to order or not", () => {
    // 1. Order waiting for bids/driver (journeyStatusId = 1, no accepted driver)
    const waitingOrder: OrderDisplayItem = {
      id: "ord-1",
      shipper: "Test Shipper",
      type: "Individual",
      vehicleType: "Truck",
      item: "Goods",
      origin: "A",
      destination: "B",
      quintal: 10,
      cost: 5000,
      status: "ongoing",
      journeyStatusId: 1,
    };
    expect(isDriverConnectedToOrder(waitingOrder)).toBe(false);

    // 2. Order with accepted bid / driver
    const acceptedOrder: OrderDisplayItem = {
      ...waitingOrder,
      journeyStatusId: 4,
    };
    expect(isDriverConnectedToOrder(acceptedOrder)).toBe(true);

    // 3. Order in transit
    const transitOrder: OrderDisplayItem = {
      ...waitingOrder,
      journeyStatusId: 8,
    };
    expect(isDriverConnectedToOrder(transitOrder)).toBe(true);

    // 4. Completed order
    const completedOrder: OrderDisplayItem = {
      ...waitingOrder,
      status: "complete",
    };
    expect(isDriverConnectedToOrder(completedOrder)).toBe(true);

    // 5. Null or undefined
    expect(isDriverConnectedToOrder(null)).toBe(false);
  });
});

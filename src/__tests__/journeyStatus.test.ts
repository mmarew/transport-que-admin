import { describe, it, expect } from "vitest";
import {
  extractJourneyStatusId,
  getJourneyStatusName,
  formatJourneyStatusLabel,
  resolveJourneyStatus,
  mapJourneyStatusToQueueStatus,
  isDriverWaiting,
<<<<<<< HEAD
  JOURNEY_STATUS_NAMES,
  JOURNEY_STATUS_LABELS,
=======
>>>>>>> dev
} from "../utils/journeyStatus";

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
});

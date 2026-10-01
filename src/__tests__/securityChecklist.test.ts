import { describe, it, expect } from "vitest";
import {
  sanitizeChecklistState,
  parseChecklistState,
  toggleTestStatus,
  computeChecklistStats,
  computeGroupStats,
  type ChecklistState,
} from "../utils/securityChecklist";
import { insaTotalTests, insaTestGroups } from "../data/insaStandard";

describe("sanitizeChecklistState", () => {
  it("returns empty state for non-object input", () => {
    expect(sanitizeChecklistState(null)).toEqual({});
    expect(sanitizeChecklistState(undefined)).toEqual({});
    expect(sanitizeChecklistState("pass")).toEqual({});
    expect(sanitizeChecklistState(42)).toEqual({});
  });

  it("keeps only valid pass/fail entries", () => {
    const raw = { 1: "pass", 2: "fail", 3: "maybe", 4: "", 5: null, 6: "pass" };
    expect(sanitizeChecklistState(raw)).toEqual({
      1: "pass",
      2: "fail",
      6: "pass",
    });
  });

  it("drops out-of-range and non-integer test numbers", () => {
    const raw: Record<number, unknown> = {
      0: "pass",
      [-1]: "fail",
      0.5: "pass",
      10: "pass",
    };
    raw[insaTotalTests + 1] = "fail";
    expect(sanitizeChecklistState(raw)).toEqual({ 10: "pass" });
  });
});

describe("parseChecklistState", () => {
  it("returns empty state for null or invalid JSON", () => {
    expect(parseChecklistState(null)).toEqual({});
    expect(parseChecklistState("")).toEqual({});
    expect(parseChecklistState("{not json")).toEqual({});
  });

  it("parses and sanitizes stored JSON", () => {
    expect(parseChecklistState('{"7":"pass","8":"fail","9":"bogus"}')).toEqual({
      7: "pass",
      8: "fail",
    });
  });
});

describe("toggleTestStatus", () => {
  it("sets a status on an untested item", () => {
    expect(toggleTestStatus({}, 5, "pass")).toEqual({ 5: "pass" });
  });

  it("clears the status when clicking the same status again", () => {
    expect(toggleTestStatus({ 5: "pass" }, 5, "pass")).toEqual({});
    expect(toggleTestStatus({ 5: "fail" }, 5, "fail")).toEqual({});
  });

  it("switches between pass and fail", () => {
    expect(toggleTestStatus({ 5: "pass" }, 5, "fail")).toEqual({ 5: "fail" });
    expect(toggleTestStatus({ 5: "fail" }, 5, "pass")).toEqual({ 5: "pass" });
  });

  it("does not mutate the previous state", () => {
    const prev: ChecklistState = { 1: "pass" };
    const next = toggleTestStatus(prev, 2, "fail");
    expect(prev).toEqual({ 1: "pass" });
    expect(next).toEqual({ 1: "pass", 2: "fail" });
  });
});

describe("computeChecklistStats", () => {
  it("reports everything untested for empty state", () => {
    const stats = computeChecklistStats({});
    expect(stats).toMatchObject({
      total: insaTotalTests,
      passed: 0,
      failed: 0,
      tested: 0,
      untested: insaTotalTests,
      score: 0,
      progress: 0,
    });
  });

  it("counts pass/fail and rounds score and progress", () => {
    const stats = computeChecklistStats({
      1: "pass",
      2: "pass",
      3: "pass",
      4: "fail",
    });
    expect(stats.passed).toBe(3);
    expect(stats.failed).toBe(1);
    expect(stats.tested).toBe(4);
    expect(stats.untested).toBe(insaTotalTests - 4);
    expect(stats.score).toBe(Math.round((3 / insaTotalTests) * 100));
    expect(stats.progress).toBe(Math.round((4 / insaTotalTests) * 100));
  });

  it("reaches 100% score when all tests pass", () => {
    const allPass: ChecklistState = {};
    for (let no = 1; no <= insaTotalTests; no++) allPass[no] = "pass";
    const stats = computeChecklistStats(allPass);
    expect(stats.score).toBe(100);
    expect(stats.untested).toBe(0);
  });
});

describe("computeGroupStats", () => {
  it("returns an entry per test group with correct totals", () => {
    const stats = computeGroupStats({});
    expect(Object.keys(stats)).toHaveLength(insaTestGroups.length);
    for (const group of insaTestGroups) {
      expect(stats[group.id]).toEqual({
        passed: 0,
        failed: 0,
        total: group.items.length,
      });
    }
  });

  it("attributes pass/fail counts to the right group", () => {
    const firstGroup = insaTestGroups[0];
    const secondGroup = insaTestGroups[1];
    const state: ChecklistState = {};
    state[firstGroup.items[0].no] = "pass";
    state[firstGroup.items[1].no] = "fail";
    state[secondGroup.items[0].no] = "pass";

    const stats = computeGroupStats(state);
    expect(stats[firstGroup.id].passed).toBe(1);
    expect(stats[firstGroup.id].failed).toBe(1);
    expect(stats[secondGroup.id].passed).toBe(1);
    expect(stats[secondGroup.id].failed).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import {
  insaStandardMeta,
  insaPrinciples,
  insaFocusAreas,
  insaVulnerabilities,
  insaTestGroups,
  insaTotalTests,
  insaTotalRequirements,
} from "../data/insaStandard";

const VALID_LEVELS = new Set(["must", "should", "may"]);

describe("INSA standard data", () => {
  it("has complete standard metadata", () => {
    expect(insaStandardMeta.name).toBe("Secure Website Management Standard");
    expect(insaStandardMeta.version).toBe("Version 1.0");
    expect(insaStandardMeta.year).toBe("2014 EC");
    expect(insaStandardMeta.issuedBy).toContain("INSA");
  });

  it("covers the five focus areas of the standard", () => {
    expect(insaFocusAreas).toHaveLength(5);
    expect(insaFocusAreas.map((f) => f.section)).toEqual([
      "2.1",
      "2.2",
      "2.3",
      "2.4",
      "2.5",
    ]);
  });

  it("has 35 requirements with unique ids, valid levels and non-empty text", () => {
    expect(insaTotalRequirements).toBe(35);
    const ids = insaFocusAreas.flatMap((f) =>
      f.requirements.map((r) => r.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const area of insaFocusAreas) {
      expect(area.objective.length).toBeGreaterThan(0);
      for (const req of area.requirements) {
        expect(VALID_LEVELS.has(req.level)).toBe(true);
        expect(req.text.length).toBeGreaterThan(0);
        if (req.subItems) {
          expect(req.subItems.length).toBeGreaterThan(0);
          expect(req.subItems.every((s) => s.length > 0)).toBe(true);
        }
      }
    }
  });

  it("lists the 8 Annex A vulnerabilities numbered 1-8 with threats", () => {
    expect(insaVulnerabilities).toHaveLength(8);
    expect(insaVulnerabilities.map((v) => v.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const v of insaVulnerabilities) {
      expect(v.vulnerability.length).toBeGreaterThan(0);
      expect(v.threats.length).toBeGreaterThan(0);
    }
  });

  it("lists all 102 Annex B tests in 8 groups, numbered 1-102 without gaps or duplicates", () => {
    expect(insaTestGroups).toHaveLength(8);
    expect(insaTotalTests).toBe(102);
    const nos = insaTestGroups.flatMap((g) => g.items.map((i) => i.no));
    expect(nos).toHaveLength(102);
    expect(new Set(nos).size).toBe(102);
    expect(Math.min(...nos)).toBe(1);
    expect(Math.max(...nos)).toBe(102);
    for (const group of insaTestGroups) {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.items.length).toBeGreaterThan(0);
      expect(group.items.every((i) => i.text.length > 0)).toBe(true);
    }
  });

  it("has the 5 guiding principles", () => {
    expect(insaPrinciples).toHaveLength(5);
    for (const p of insaPrinciples) {
      expect(p.titleKey.startsWith("security.principles.")).toBe(true);
      expect(p.text.length).toBeGreaterThan(0);
    }
  });
});

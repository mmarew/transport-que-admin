import { insaTestGroups, insaTotalTests } from "@/data/insaStandard";

export type TestStatus = "pass" | "fail";
export type ChecklistState = Record<number, TestStatus>;

export interface ChecklistStats {
  total: number;
  passed: number;
  failed: number;
  tested: number;
  untested: number;
  score: number;
  progress: number;
}

export type GroupStats = Record<
  string,
  { passed: number; failed: number; total: number }
>;

export function sanitizeChecklistState(raw: unknown): ChecklistState {
  if (typeof raw !== "object" || raw === null) return {};
  const valid: ChecklistState = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const no = Number(key);
    if (!Number.isInteger(no) || no < 1 || no > insaTotalTests) continue;
    if (value === "pass" || value === "fail") valid[no] = value;
  }
  return valid;
}

export function parseChecklistState(json: string | null): ChecklistState {
  if (!json) return {};
  try {
    return sanitizeChecklistState(JSON.parse(json));
  } catch {
    return {};
  }
}

// Clicking the active status clears it (back to untested)
export function toggleTestStatus(
  state: ChecklistState,
  no: number,
  status: TestStatus,
): ChecklistState {
  const next = { ...state };
  if (next[no] === status) {
    delete next[no];
  } else {
    next[no] = status;
  }
  return next;
}

export function computeChecklistStats(state: ChecklistState): ChecklistStats {
  let passed = 0;
  let failed = 0;
  for (const value of Object.values(state)) {
    if (value === "pass") passed += 1;
    else if (value === "fail") failed += 1;
  }
  const tested = passed + failed;
  const untested = insaTotalTests - tested;
  const score =
    insaTotalTests > 0 ? Math.round((passed / insaTotalTests) * 100) : 0;
  const progress =
    insaTotalTests > 0 ? Math.round((tested / insaTotalTests) * 100) : 0;
  return { total: insaTotalTests, passed, failed, tested, untested, score, progress };
}

export function computeGroupStats(state: ChecklistState): GroupStats {
  const map: GroupStats = {};
  for (const group of insaTestGroups) {
    let passed = 0;
    let failed = 0;
    for (const item of group.items) {
      const status = state[item.no];
      if (status === "pass") passed += 1;
      else if (status === "fail") failed += 1;
    }
    map[group.id] = { passed, failed, total: group.items.length };
  }
  return map;
}

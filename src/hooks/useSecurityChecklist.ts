import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeChecklistStats,
  computeGroupStats,
  parseChecklistState,
  toggleTestStatus,
  type ChecklistState,
  type TestStatus,
} from "@/utils/securityChecklist";

export type { ChecklistState, TestStatus };

const STORAGE_KEY = "insa_security_checklist_v1";

export function useSecurityChecklist() {
  const [statuses, setStatuses] = useState<ChecklistState>(() =>
    parseChecklistState(localStorage.getItem(STORAGE_KEY)),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  }, [statuses]);

  const setStatus = useCallback((no: number, status: TestStatus) => {
    setStatuses((prev) => toggleTestStatus(prev, no, status));
  }, []);

  const resetAll = useCallback(() => setStatuses({}), []);

  const stats = useMemo(() => computeChecklistStats(statuses), [statuses]);

  const groupStats = useMemo(() => computeGroupStats(statuses), [statuses]);

  return { statuses, setStatus, resetAll, stats, groupStats };
}

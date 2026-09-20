import { useMemo } from "react";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetQueueStatusQuery,
} from "@/lib/redux/api";
import { useQueueAdminStore } from "@/store/queueAdminStore";
import type { QueueOrgListItem } from "@/types/queue";
import { isDriverWaiting } from "@/utils/journeyStatus";

export function useReportsMetrics() {
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);

  // 1. Fetch Real Organizations
  const { data: rawOrgsData } = useListQueueOrganizationsQuery();
  const orgList: QueueOrgListItem[] = useMemo(() => {
    if (!rawOrgsData) return [];
    if (Array.isArray(rawOrgsData)) return rawOrgsData as QueueOrgListItem[];
    const payload = rawOrgsData as unknown as Record<string, unknown>;
    if (Array.isArray(payload.data)) return payload.data as QueueOrgListItem[];
    if (Array.isArray(payload.organizations))
      return payload.organizations as QueueOrgListItem[];
    return [];
  }, [rawOrgsData]);

  // Determine active organization ID
  const activeOrgId =
    selectedOrgId &&
    orgList.some((o) => o.organization.queueOrganizationUniqueId === selectedOrgId)
      ? selectedOrgId
      : orgList[0]?.organization?.queueOrganizationUniqueId || "";

  // 2. Fetch Real Queue Status for Active Terminal
  const { data: queueStatusData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: activeOrgId },
    { skip: !activeOrgId },
  );

  // 3. Fetch Real Orders / Requests for Active Terminal
  const { data: ordersData } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId: activeOrgId, target: "all", limit: 100 },
    { skip: !activeOrgId },
  );
  const allOrders = useMemo(
    () => (Array.isArray(ordersData?.data) ? ordersData.data : []),
    [ordersData],
  );

  // Flatten all real queue entries
  const allQueueEntries = useMemo(() => {
    if (!queueStatusData?.data?.queues) return [];
    return Object.values(queueStatusData.data.queues).flat();
  }, [queueStatusData]);

  // Real Metric Calculations
  const totalOrgs = orgList.length;
  const activeOrgs = orgList.filter(
    (o) =>
      String(o.organization.approvalStatus || "").toLowerCase() === "approved",
  ).length;

  const totalDriversCount = allQueueEntries.length;
  const totalOrdersCount = allOrders.length;

  // Real Driver Status Counts
  const waitingCount = allQueueEntries.filter((e) =>
    isDriverWaiting(e.status, (e as any).journeyStatusId),
  ).length;
  const offeredCount = allQueueEntries.filter(
    (e) => e.status === "offered",
  ).length;
  const loadedCount = allQueueEntries.filter(
    (e) =>
      (e.status as string) === "loaded" ||
      (e.status as string) === "assigned" ||
      (e.status as string) === "completed",
  ).length;
  const totalQueueDrivers = allQueueEntries.length;

  // Real Percentages for Donut Chart
  const waitingPercent =
    totalQueueDrivers > 0
      ? Math.round((waitingCount / totalQueueDrivers) * 100)
      : 0;
  const offeredPercent =
    totalQueueDrivers > 0
      ? Math.round((offeredCount / totalQueueDrivers) * 100)
      : 0;
  const loadedPercent =
    totalQueueDrivers > 0
      ? Math.max(0, 100 - waitingPercent - offeredPercent)
      : 0;

  // Monthly Requests Calculation
  const currentMonthIdx = new Date().getMonth();
  const monthlyRequests = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (allOrders.length > 0) {
      allOrders.forEach((o) => {
        const dateStr =
          o.shipperRequest?.shipperRequestCreatedAt ||
          o.shipperRequest?.shippingDate;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            counts[d.getMonth()] = (counts[d.getMonth()] || 0) + 1;
          }
        }
      });
    }
    return counts;
  }, [allOrders]);

  const currentMonthRequests = monthlyRequests[currentMonthIdx] || 0;
  const maxMonthlyCount = Math.max(10, Math.max(...monthlyRequests));

  return {
    orgList,
    totalOrgs,
    activeOrgs,
    totalDriversCount,
    totalOrdersCount,
    waitingCount,
    offeredCount,
    loadedCount,
    waitingPercent,
    offeredPercent,
    loadedPercent,
    monthlyRequests,
    currentMonthIdx,
    currentMonthRequests,
    maxMonthlyCount,
  };
}

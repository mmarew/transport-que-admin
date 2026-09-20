import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetQueueStatusQuery } from "../lib/redux/api";
import { useQueueAdminStore } from "../store/queueAdminStore";
import { subscribeToQueue, unsubscribeFromQueue } from "../lib/socket";
import type { QueueOrgListItem } from "../types/queue";

export function useActiveOrg(orgList: QueueOrgListItem[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  // URL ?orgId= is the single source of truth for the selected org.
  const activeOrgId = searchParams.get("orgId") || null;

  // Keep the store selection mirrored to the URL (covers Back button, sidebar nav).
  useEffect(() => {
    setSelectedOrgId(activeOrgId || "");
  }, [activeOrgId, setSelectedOrgId]);

  // Subscribe to active organization room so real-time approval/updates arrive even if pending
  useEffect(() => {
    if (!activeOrgId) return;
    subscribeToQueue(activeOrgId);
    return () => {
      unsubscribeFromQueue(activeOrgId);
    };
  }, [activeOrgId]);

  // If no active org is selected, subscribe to all listed orgs to catch live approval state transitions
  useEffect(() => {
    if (activeOrgId) return;
    const orgIds = orgList
      .map((item) => item.organization?.queueOrganizationUniqueId)
      .filter((id): id is string => Boolean(id));

    orgIds.forEach((id) => subscribeToQueue(id));
    return () => {
      orgIds.forEach((id) => unsubscribeFromQueue(id));
    };
  }, [activeOrgId, orgList]);

  const {
    data: queueStatusData,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: activeOrgId || "" },
    { skip: !activeOrgId },
  );

  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return (
      orgList.find(
        (item) => item.organization?.queueOrganizationUniqueId === activeOrgId,
      )?.organization || null
    );
  }, [orgList, activeOrgId]);

  const selectOrg = (orgId: string) => {
    setSearchParams({ orgId }, { replace: true });
  };

  const clearActiveOrg = () => {
    setSearchParams({}, { replace: true });
  };

  return {
    activeOrgId,
    activeOrg,
    queueStatusData,
    statusLoading,
    refetchStatus,
    selectOrg,
    clearActiveOrg,
  };
}
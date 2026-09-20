import { useState, useMemo } from "react";
import { useListQueueOrganizationsQuery } from "../lib/redux/api";
import type { QueueOrgListItem } from "../types/queue";
import { extractCity, normalizeOrgList } from "../utils/formatters";
import type { OrgSortField } from "../components/dashboard/OrgListToolbar";

const PAGE_SIZE = 8;

export function useOrgList() {
  const {
    data: rawData,
    isLoading,
    error,
    refetch: refetchOrgs,
  } = useListQueueOrganizationsQuery();

  const orgList: QueueOrgListItem[] = useMemo(
    () => normalizeOrgList(rawData),
    [rawData],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<OrgSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const processedOrgs = useMemo(() => {
    const result = orgList.filter((item) => {
      const org = item.organization;
      if (!org) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        org.queueOrganizationName?.toLowerCase().includes(q) ||
        org.queueOrganizationType?.toLowerCase().includes(q) ||
        org.queueOrganizationAddress?.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      const orgA = a.organization;
      const orgB = b.organization;
      let valA = "";
      let valB = "";

      if (sortField === "name") {
        valA = orgA.queueOrganizationName || "";
        valB = orgB.queueOrganizationName || "";
      } else if (sortField === "type") {
        valA = orgA.queueOrganizationType || "";
        valB = orgB.queueOrganizationType || "";
      } else if (sortField === "city") {
        valA = extractCity(orgA.queueOrganizationAddress);
        valB = extractCity(orgB.queueOrganizationAddress);
      } else if (sortField === "status") {
        valA = orgA.approvalStatus || "";
        valB = orgB.approvalStatus || "";
      } else if (sortField === "enabled") {
        valA = orgA.queueEnabled ? "Yes" : "No";
        valB = orgB.queueEnabled ? "Yes" : "No";
      }

      return sortOrder === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

    return result;
  }, [orgList, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(processedOrgs.length / PAGE_SIZE) || 1;
  const paginatedOrgs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return processedOrgs.slice(start, start + PAGE_SIZE);
  }, [processedOrgs, currentPage]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSort = (field: OrgSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return {
    orgList,
    processedOrgs,
    paginatedOrgs,
    totalPages,
    isLoading,
    error,
    refetchOrgs,
    searchQuery,
    handleSearchChange,
    sortField,
    handleSort,
    currentPage,
    setCurrentPage,
  };
}
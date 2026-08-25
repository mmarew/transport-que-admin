import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  AlertCircle,
  Check,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useListQueueOrganizationsQuery } from "../lib/redux/api";
import { useQueueAdminStore } from "../store/queueAdminStore";
import type { QueueOrgListItem } from "../types/queue";
import { extractCity } from "../utils/formatters";
import "./OrganizationsPage.css";

const PAGE_SIZE = 8;
const SORT_LABELS: Record<string, string> = {
  name: "Organization Name",
  type: "Type",
  city: "City",
  status: "Status",
  enabled: "Enabled",
};

export function OrganizationsPage() {
  const navigate = useNavigate();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "type" | "city" | "status" | "enabled">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useListQueueOrganizationsQuery();

  const orgList: QueueOrgListItem[] = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData as QueueOrgListItem[];
    const payload = rawData as unknown as Record<string, unknown>;
    if (Array.isArray(payload.data)) return payload.data as QueueOrgListItem[];
    if (Array.isArray(payload.organizations)) return payload.organizations as QueueOrgListItem[];
    return [];
  }, [rawData]);

  const processedOrgs = useMemo(() => {
    let result = orgList.filter((item) => {
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

      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return result;
  }, [orgList, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(processedOrgs.length / PAGE_SIZE) || 1;
  const paginatedOrgs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return processedOrgs.slice(start, start + PAGE_SIZE);
  }, [processedOrgs, currentPage]);

  const handleSort = (field: "name" | "type" | "city" | "status" | "enabled") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleManage = (orgId: string) => {
    setSelectedOrgId(orgId);
    navigate(`/dashboard?orgId=${orgId}`);
  };

  return (
    <DashboardLayout
      title="Organizations"
      subtitle="Select a queue organization to monitor"
      activeTab="organizations"
    >
      <div className="org-page-card">
        <div className="org-top-controls">
          <div className="org-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search Organizations"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="org-search-input"
            />
          </div>

          <div className="org-sort-container" ref={sortMenuRef}>
            <button
              type="button"
              className="org-sort-btn"
              onClick={() => setShowSortMenu((v) => !v)}
            >
              <span>Sort</span>
              <ChevronDown size={14} className={`org-sort-chevron ${showSortMenu ? "open" : ""}`} />
            </button>

            {showSortMenu && (
              <div className="org-sort-menu">
                {(["name", "type", "city", "status", "enabled"] as const).map((field) => (
                  <button
                    key={field}
                    type="button"
                    className={`org-sort-menu-item ${sortField === field ? "active" : ""}`}
                    onClick={() => {
                      handleSort(field);
                      setShowSortMenu(false);
                    }}
                  >
                    <span>{SORT_LABELS[field]}</span>
                    {sortField === field && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div className="add-docs-spinner" style={{ width: 28, height: 28, margin: "0 auto 1rem" }} />
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading organizations...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#dc2626" }}>
            <AlertCircle size={32} style={{ margin: "0 auto 0.5rem" }} />
            <p style={{ fontWeight: 500 }}>Failed to load organizations</p>
            <button
              type="button"
              onClick={() => refetch()}
              style={{ marginTop: "0.75rem", padding: "0.4rem 1rem", border: "1px solid #dc2626", borderRadius: "0.375rem", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "0.8125rem" }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && processedOrgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <Building2 size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", margin: 0 }}>
              {searchQuery ? "No matching organizations found" : "No Organizations Available"}
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {searchQuery ? "Try a different search term" : "Registered queue stations will appear here"}
            </p>
          </div>
        )}

        {/* Desktop Table & Mobile Cards */}
        {!isLoading && !error && paginatedOrgs.length > 0 && (
          <>
            <div className="org-table-wrapper">
              <table className="org-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">Organization <ChevronDown size={13} /></span>
                    </th>
                    <th onClick={() => handleSort("type")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">Type <ChevronDown size={13} /></span>
                    </th>
                    <th onClick={() => handleSort("city")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">City <ChevronDown size={13} /></span>
                    </th>
                    <th>Status</th>
                    <th onClick={() => handleSort("enabled")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">Enabled <ChevronDown size={13} /></span>
                    </th>
                    <th style={{ textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrgs.map(({ organization: org }) => {
                    const city = extractCity(org.queueOrganizationAddress);
                    const status = String(org.approvalStatus || "pending").toLowerCase();
                    const isEnabled = org.queueEnabled === 1 ? "Yes" : "No";

                    return (
                      <tr key={org.queueOrganizationUniqueId}>
                        <td className="org-cell-name">{org.queueOrganizationName}</td>
                        <td className="org-cell-type">{org.queueOrganizationType}</td>
                        <td className="org-cell-city">{city}</td>
                        <td>
                          <span className="org-status-pill">
                            <span className={`org-status-dot ${status}`} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td>{isEnabled}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="org-manage-action-btn"
                            onClick={() => handleManage(org.queueOrganizationUniqueId)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Compact) */}
            <div className="org-cards-mobile">
              {paginatedOrgs.map(({ organization: org }) => {
                const city = extractCity(org.queueOrganizationAddress);
                const status = String(org.approvalStatus || "pending").toLowerCase();

                return (
                  <div key={org.queueOrganizationUniqueId} className="org-mobile-card">
                    <div className="org-mc-info">
                      <h4 className="org-mc-title">{org.queueOrganizationName}</h4>
                      <div className="org-mc-meta">
                        <span>{org.queueOrganizationType}</span>
                        <span className="org-mc-bullet">•</span>
                        <span>{city}</span>
                        <span className="org-mc-bullet">•</span>
                        <span>{org.queueEnabled === 1 ? "Enabled" : "Disabled"}</span>
                      </div>
                    </div>
                    <div className="org-mc-side">
                      <span className="org-status-pill">
                        <span className={`org-status-dot ${status}`} />
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                      <button
                        type="button"
                        className="org-manage-action-btn"
                        onClick={() => handleManage(org.queueOrganizationUniqueId)}
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer & Pagination */}
        {!isLoading && !error && processedOrgs.length > 0 && (
          <div className="org-table-footer">
            <span>Show {paginatedOrgs.length} of {processedOrgs.length}</span>
            <div className="org-pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`org-page-btn ${currentPage === page ? "active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              {totalPages > 1 && (
                <button
                  type="button"
                  className="org-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default OrganizationsPage;

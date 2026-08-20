import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, ChevronRight, Building2, AlertCircle } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useListQueueOrganizationsQuery } from "../lib/redux/api";
import { useQueueAdminStore } from "../store/queueAdminStore";
import type { QueueOrgListItem, ApprovalStatus } from "../types/queue";
import "./OrganizationsPage.css";

const PAGE_SIZE = 8;

function extractCity(address?: string | null): string {
  if (!address) return "Addis Ababa";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2] || parts[0];
  }
  return parts[0] || "Addis Ababa";
}

export function OrganizationsPage() {
  const navigate = useNavigate();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "type" | "city" | "status" | "enabled">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: rawData,
    isLoading,
    error,
    refetch,
  } = useListQueueOrganizationsQuery();

  // Extract organizations array
  const orgList: QueueOrgListItem[] = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData as QueueOrgListItem[];
    const payload = rawData as unknown as Record<string, unknown>;
    if (Array.isArray(payload.data)) {
      return payload.data as QueueOrgListItem[];
    }
    if (Array.isArray(payload.organizations)) {
      return payload.organizations as QueueOrgListItem[];
    }
    return [];
  }, [rawData]);

  // Filter and Sort
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

  // Pagination
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
    navigate(`/orgs/${orgId}`);
  };

  return (
    <DashboardLayout
      title="Organizations"
      subtitle="Select an organization to manage its queue"
      activeTab="organizations"
    >
      <div className="org-page-card">
        {/* Top Controls: Search + Sort */}
        <div className="org-top-controls">
          <div className="org-search-box">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search Organizations"
              className="org-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="org-sort-btn"
            onClick={() => handleSort("name")}
          >
            Sort
            <ChevronDown size={14} color="#64748b" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
            <span className="add-docs-spinner" style={{ borderColor: "#e2e8f0", borderTopColor: "#0B4D6D" }} />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <AlertCircle size={32} color="#ef4444" style={{ margin: "0 auto 0.5rem" }} />
            <p style={{ color: "#1e293b", fontWeight: 600 }}>Unable to load organizations</p>
            <button
              onClick={() => refetch()}
              style={{
                marginTop: "0.5rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "0.375rem",
                background: "#0B4D6D",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
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

        {/* Organizations Table matching design */}
        {!isLoading && !error && paginatedOrgs.length > 0 && (
          <div className="org-table-wrapper">
            <table className="org-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                    <span className="org-th-sortable">
                      Organization <ChevronDown size={13} />
                    </span>
                  </th>
                  <th onClick={() => handleSort("type")} style={{ cursor: "pointer" }}>
                    <span className="org-th-sortable">
                      Type <ChevronDown size={13} />
                    </span>
                  </th>
                  <th onClick={() => handleSort("city")} style={{ cursor: "pointer" }}>
                    <span className="org-th-sortable">
                      City <ChevronDown size={13} />
                    </span>
                  </th>
                  <th>Status</th>
                  <th onClick={() => handleSort("enabled")} style={{ cursor: "pointer" }}>
                    <span className="org-th-sortable">
                      Enabled <ChevronDown size={13} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrgs.map(({ organization: org }) => {
                  const city = extractCity(org.queueOrganizationAddress);
                  const status = (org.approvalStatus || "pending") as ApprovalStatus;
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
        )}

        {/* Footer & Pagination */}
        {!isLoading && !error && processedOrgs.length > 0 && (
          <div className="org-table-footer">
            <span>
              Show {paginatedOrgs.length} of {processedOrgs.length}
            </span>

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

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Plus,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  useListQueueOrganizationsQuery,
  useGetQueueStatusQuery,
} from "../lib/redux/api";
import { createQueueOrganization } from "../services/organization.service";
import { useQueueAdminStore } from "../store/queueAdminStore";
import { QueueBoard } from "../components/queue/QueueBoard";
import { CreateOrgModal } from "../components/queue/CreateOrgModal";
import type { QueueOrgListItem, QueueOrganization, QueueOrgType, ApprovalStatus } from "../types/queue";
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

export function QueueDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  // If URL has ?orgId=, use it; otherwise null (show table)
  const urlOrgId = searchParams.get("orgId");
  const [activeOrgId, setActiveOrgId] = useState<string | null>(urlOrgId || null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "type" | "city" | "status" | "enabled">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  const {
    data: rawData,
    isLoading: orgsLoading,
    error: orgsError,
    refetch: refetchOrgs,
  } = useListQueueOrganizationsQuery();

  // Extract organizations array safely
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

  // Sync URL search params
  useEffect(() => {
    if (activeOrgId) {
      setSearchParams({ orgId: activeOrgId }, { replace: true });
      setSelectedOrgId(activeOrgId);
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeOrgId, setSearchParams, setSelectedOrgId]);

  // Find active organization
  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return orgList.find(
      (item) => item.organization.queueOrganizationUniqueId === activeOrgId,
    )?.organization;
  }, [orgList, activeOrgId]);

  // Only query status if active organization is approved
  const isApproved = activeOrg?.approvalStatus === "approved";

  const {
    data: queueStatusData,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: activeOrgId || "" },
    { skip: !activeOrgId || !isApproved },
  );

  // Filter and Sort for the Organizations Table
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

  const handleManage = (org: QueueOrganization) => {
    if (org.approvalStatus !== "approved") {
      toast.warning(
        `"${org.queueOrganizationName}" is ${org.approvalStatus}. Only approved organizations can manage live queues.`
      );
      return;
    }
    setActiveOrgId(org.queueOrganizationUniqueId);
  };

  const handleBackToTable = () => {
    setActiveOrgId(null);
  };

  const handleCreateOrg = async (data: {
    queueOrganizationName: string;
    queueOrganizationType: QueueOrgType;
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => {
    await createQueueOrganization(data);
    refetchOrgs();
  };

  return (
    <DashboardLayout
      title={activeOrg ? undefined : "Organizations"}
      subtitle={activeOrg ? undefined : "Select an organization to manage its queue"}
      activeTab="dashboard"
      actions={
        !activeOrgId ? (
          <button
            type="button"
            className="qb-btn-new-order"
            onClick={() => setShowCreateOrgModal(true)}
          >
            <Plus size={16} />
            New Organization
          </button>
        ) : undefined
      }
    >
      {/* ── View 1A: Approved Active Organization Queue Board ── */}
      {activeOrg && activeOrgId && isApproved && (
        <QueueBoard
          queueOrganizationUniqueId={activeOrgId}
          orgName={activeOrg.queueOrganizationName}
          orgType={activeOrg.queueOrganizationType}
          city={extractCity(activeOrg.queueOrganizationAddress)}
          origin={{
            latitude: activeOrg.latitude ? Number(activeOrg.latitude) : null,
            longitude: activeOrg.longitude ? Number(activeOrg.longitude) : null,
            description: activeOrg.queueOrganizationAddress,
          }}
          status={queueStatusData?.data}
          isLoading={statusLoading}
          error={statusError}
          onRefetch={refetchStatus}
          onBack={handleBackToTable}
        />
      )}

      {/* ── View 1B: Organization is Pending / Not Approved Banner ── */}
      {activeOrg && activeOrgId && !isApproved && (
        <div className="qb-page-container">
          <button type="button" className="qb-back-link" onClick={handleBackToTable}>
            <ArrowLeft size={16} />
            Back to Organizations
          </button>

          <div
            className="qb-card"
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              maxWidth: "600px",
              margin: "1rem auto",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: activeOrg.approvalStatus === "pending" ? "#fef3c7" : "#fee2e2",
                color: activeOrg.approvalStatus === "pending" ? "#d97706" : "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              {activeOrg.approvalStatus === "pending" ? (
                <Clock size={28} />
              ) : (
                <AlertCircle size={28} />
              )}
            </div>

            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>
              Organization {activeOrg.approvalStatus === "pending" ? "Pending Approval" : "Not Approved"}
            </h2>

            <p style={{ color: "#64748b", fontSize: "0.925rem", lineHeight: 1.6, margin: "0 auto 1.75rem", maxWidth: "460px" }}>
              <strong>{activeOrg.queueOrganizationName}</strong> is currently{" "}
              <span
                style={{
                  fontWeight: 600,
                  textTransform: "capitalize",
                  color: activeOrg.approvalStatus === "pending" ? "#d97706" : "#dc2626",
                }}
              >
                {activeOrg.approvalStatus}
              </span>
              . Live queue management and driver dispatches will become available once approved by system administrators.
            </p>

            <button
              type="button"
              className="qb-btn-new-order"
              onClick={handleBackToTable}
              style={{ margin: "0 auto" }}
            >
              <ArrowLeft size={16} />
              Return to Organizations List
            </button>
          </div>
        </div>
      )}

      {/* ── View 2: Organizations List Table ── */}
      {!activeOrgId && (
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
          {orgsLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
              <span className="add-docs-spinner" style={{ borderColor: "#e2e8f0", borderTopColor: "#0B4D6D" }} />
            </div>
          )}

          {/* Error State */}
          {!orgsLoading && orgsError && (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <AlertCircle size={32} color="#ef4444" style={{ margin: "0 auto 0.5rem" }} />
              <p style={{ color: "#1e293b", fontWeight: 600 }}>Unable to load organizations</p>
              <button
                onClick={() => refetchOrgs()}
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
          {!orgsLoading && !orgsError && processedOrgs.length === 0 && (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <Building2 size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", margin: 0 }}>
                {searchQuery ? "No matching organizations found" : "No Organizations Available"}
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem", marginBottom: "1.25rem" }}>
                {searchQuery ? "Try a different search term" : "Create your first organization station to begin."}
              </p>
              <button
                type="button"
                className="qb-btn-new-order"
                onClick={() => setShowCreateOrgModal(true)}
                style={{ margin: "0 auto" }}
              >
                <Plus size={16} />
                Create Organization
              </button>
            </div>
          )}

          {/* Organizations Table */}
          {!orgsLoading && !orgsError && paginatedOrgs.length > 0 && (
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
                    const isOrgApproved = org.approvalStatus === "approved";

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
                            className={`org-manage-action-btn ${!isOrgApproved ? "disabled" : ""}`}
                            onClick={() => handleManage(org)}
                            title={
                              !isOrgApproved
                                ? `Cannot open queue: Organization is ${org.approvalStatus}`
                                : "Manage Queue"
                            }
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
          {!orgsLoading && !orgsError && processedOrgs.length > 0 && (
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
      )}

      {/* ── Create Organization Modal ── */}
      {showCreateOrgModal && (
        <CreateOrgModal
          onClose={() => setShowCreateOrgModal(false)}
          onCreated={() => {
            setShowCreateOrgModal(false);
            refetchOrgs();
          }}
          onCreate={handleCreateOrg}
        />
      )}
    </DashboardLayout>
  );
}

export default QueueDashboardPage;
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Building2,
  AlertCircle,
  Check,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  useListQueueOrganizationsQuery,
  useCreateQueueOrganizationMutation,
} from "../../lib/redux/api";
import CreateOrgModal from "../../components/queue/CreateOrgModal";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import { subscribeToQueue, unsubscribeFromQueue } from "../../lib/socket";
import type { QueueOrgListItem } from "../../types/queue";
import { extractCity, normalizeOrgList } from "../../utils/formatters";
import "./OrganizationsPage.css";

const PAGE_SIZE = 8;

export function OrganizationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "type" | "city" | "status" | "enabled">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [createQueueOrg] = useCreateQueueOrganizationMutation();

  const SORT_LABELS: Record<string, string> = {
    name: t("dashboard.orgName"),
    type: t("dashboard.type"),
    city: t("dashboard.city"),
    status: t("dashboard.status"),
    enabled: t("dashboard.enabled"),
  };

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
    return normalizeOrgList(rawData);
  }, [rawData]);

  useEffect(() => {
    const orgIds = orgList
      .map((item) => item.organization?.queueOrganizationUniqueId)
      .filter((id): id is string => Boolean(id));

    orgIds.forEach((id) => subscribeToQueue(id));
    return () => {
      orgIds.forEach((id) => unsubscribeFromQueue(id));
    };
  }, [orgList]);

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

      const cmp = valA.localeCompare(valB, undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
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

  const handleManage = (queueOrganizationUniqueId: string) => {
    setSelectedOrgId(queueOrganizationUniqueId);
    navigate(`/dashboard?orgId=${queueOrganizationUniqueId}`);
  };

  const handleCreateOrg = async (formData: {
    queueOrganizationName: string;
    queueOrganizationType: any;
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => {
    try {
      await createQueueOrg(formData).unwrap();
      toast.success("Organization created successfully");
      setShowCreateOrg(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create organization");
    }
  };

  return (
    <DashboardLayout
      title={t("dashboard.title")}
      subtitle={t("dashboard.subtitle")}
      activeTab="organizations"
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreateOrg(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "#0B4D6D",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.625rem",
            padding: "0.65rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          <span>{t("dashboard.newOrg", "New Organization")}</span>
        </button>
      }
    >
      <div className="org-page-card">
        {/* Top Controls Toolbar */}
        <div className="org-top-controls">
          <div className="org-search-box">
            <Search size={16} className="search-icon" />
            <input
              id="organizations-search-input"
              name="searchOrgs"
              type="text"
              placeholder={t("dashboard.searchOrgs", "Search Organizations")}
              aria-label={t("dashboard.searchOrgs", "Search Organizations")}
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
              <span>{t("dashboard.sort", "Sort")}</span>
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

          {/* Mobile + Add Button */}
          <button
            type="button"
            className="org-btn-add"
            onClick={() => setShowCreateOrg(true)}
          >
            <Plus size={15} />
            <span>{t("dashboard.addOrgMobile", "Add")}</span>
          </button>
        </div>

        {isLoading && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div className="add-docs-spinner" style={{ width: 28, height: 28, margin: "0 auto 1rem" }} />
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{t("common.loading")}</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#dc2626" }}>
            <AlertCircle size={32} style={{ margin: "0 auto 0.5rem" }} />
            <p style={{ fontWeight: 500 }}>Failed to load organizations</p>
            <button
              type="button"
              onClick={() => refetch()}
              style={{
                marginTop: "0.75rem",
                padding: "0.4rem 1rem",
                border: "1px solid #dc2626",
                borderRadius: "0.375rem",
                background: "transparent",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "0.8125rem",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && processedOrgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <Building2 size={36} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", margin: 0 }}>
              {searchQuery ? t("dashboard.noMatching") : t("dashboard.noOrgs")}
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {searchQuery ? t("dashboard.tryDifferent") : t("dashboard.registeredAppear")}
            </p>
          </div>
        )}

        {/* Clean Table Layout */}
        {!isLoading && !error && paginatedOrgs.length > 0 && (
          <>
            <div className="org-table-wrapper">
              <table className="org-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">{t("dashboard.orgName", "Organization")} <ChevronDown size={13} /></span>
                    </th>
                    <th onClick={() => handleSort("type")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">{t("dashboard.type", "Type")} <ChevronDown size={13} /></span>
                    </th>
                    <th onClick={() => handleSort("city")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">{t("dashboard.city", "City")} <ChevronDown size={13} /></span>
                    </th>
                    <th>{t("dashboard.status", "Status")}</th>
                    <th onClick={() => handleSort("enabled")} style={{ cursor: "pointer" }}>
                      <span className="org-th-sortable">{t("dashboard.enabled", "Enabled")} <ChevronDown size={13} /></span>
                    </th>
                    <th style={{ textAlign: "left" }}>{t("common.actions", "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrgs.map(({ organization: org }) => {
                    const city = extractCity(org.queueOrganizationAddress);
                    const status = String(org.approvalStatus || "pending").toLowerCase();
                    const isApproved = status === "approved";
                    const isEnabled = org.queueEnabled === 1 ? t("dashboard.yes", "Yes") : t("dashboard.no", "No");
                    const statusLabel = isApproved
                      ? t("dashboard.approved", "Approved")
                      : status === "pending"
                        ? t("dashboard.pending", "Pending")
                        : status.charAt(0).toUpperCase() + status.slice(1);

                    return (
                      <tr key={org.queueOrganizationUniqueId}>
                        <td className="org-cell-name">{org.queueOrganizationName}</td>
                        <td className="org-cell-type">{org.queueOrganizationType}</td>
                        <td className="org-cell-city">{city}</td>
                        <td>
                          <span className={`org-status-text ${status}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td>{isEnabled}</td>
                        <td>
                          <button
                            type="button"
                            className={`org-manage-link ${!isApproved ? "disabled" : ""}`}
                            disabled={!isApproved}
                            onClick={() => handleManage(org.queueOrganizationUniqueId)}
                            title={!isApproved ? "Unapproved organizations cannot be managed" : "Manage Queue"}
                          >
                            {t("dashboard.manage", "Manage")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer & Pagination */}
            <div className="org-table-footer">
              <span>{t("dashboard.showOf", { current: paginatedOrgs.length, total: processedOrgs.length, defaultValue: `Show ${paginatedOrgs.length} of ${processedOrgs.length}` })}</span>
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
          </>
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <CreateOrgModal
          onClose={() => setShowCreateOrg(false)}
          onCreate={handleCreateOrg}
        />
      )}
    </DashboardLayout>
  );
}

export default OrganizationsPage;

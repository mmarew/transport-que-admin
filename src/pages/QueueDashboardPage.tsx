import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Check,
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
import type { QueueOrgListItem, QueueOrganization, QueueOrgType } from "../types/queue";
import { extractCity } from "../utils/formatters";
import "./OrganizationsPage.css";

const PAGE_SIZE = 8;

export function QueueDashboardPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const setSelectedOrgId = useQueueAdminStore((s) => s.setSelectedOrgId);

  const urlOrgId = searchParams.get("orgId");
  const [activeOrgId, setActiveOrgId] = useState<string | null>(urlOrgId || null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "type" | "city" | "status" | "enabled">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

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
    isLoading: orgsLoading,
    error: orgsError,
    refetch: refetchOrgs,
  } = useListQueueOrganizationsQuery();

  const orgList: QueueOrgListItem[] = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData as QueueOrgListItem[];
    const payload = rawData as unknown as Record<string, unknown>;
    if (Array.isArray(payload.data)) return payload.data as QueueOrgListItem[];
    if (Array.isArray(payload.organizations)) return payload.organizations as QueueOrgListItem[];
    return [];
  }, [rawData]);

  useEffect(() => {
    if (activeOrgId) {
      setSearchParams({ orgId: activeOrgId }, { replace: true });
      setSelectedOrgId(activeOrgId);
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [activeOrgId, setSearchParams, setSelectedOrgId]);

  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return orgList.find(
      (item) => item.organization.queueOrganizationUniqueId === activeOrgId,
    )?.organization;
  }, [orgList, activeOrgId]);

  const isApproved = String(activeOrg?.approvalStatus || "").toLowerCase() === "approved";

  const {
    data: queueStatusData,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: activeOrgId || "" },
    { skip: !activeOrgId || !isApproved },
  );

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

  const handleManage = (org: QueueOrganization) => {
    const status = String(org.approvalStatus || "").toLowerCase();
    if (status !== "approved") {
      toast.warning(
        `"${org.queueOrganizationName}" is ${org.approvalStatus}. Only approved organizations can manage live queues.`
      );
      return;
    }
    setActiveOrgId(org.queueOrganizationUniqueId);
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
      title={activeOrg ? undefined : t("dashboard.title")}
      subtitle={activeOrg ? undefined : t("dashboard.subtitle")}
      activeTab="dashboard"
      actions={
        !activeOrgId ? (
          <button
            type="button"
            className="qb-btn-new-order"
            onClick={() => setShowCreateOrgModal(true)}
          >
            <Plus size={16} />
            <span>{t("dashboard.newOrg")}</span>
          </button>
        ) : undefined
      }
    >
      {activeOrg ? (
        <div className="active-org-view">
          {activeOrg.approvalStatus === "pending" && (
            <div className="org-approval-banner pending">
              <div className="org-approval-banner-icon"><Clock size={20} /></div>
              <div className="org-approval-banner-content">
                <h3>Approval Pending</h3>
                <p>This organization is awaiting administrator approval. The live queue board will be available once approved.</p>
              </div>
              <button type="button" className="org-approval-back-btn" onClick={() => setActiveOrgId(null)}>
                <ArrowLeft size={16} /> {t("queue.backToOrgs")}
              </button>
            </div>
          )}

          {activeOrg.approvalStatus === "rejected" && (
            <div className="org-approval-banner rejected">
              <div className="org-approval-banner-icon"><AlertCircle size={20} /></div>
              <div className="org-approval-banner-content">
                <h3>Organization Rejected</h3>
                <p>This organization was rejected and cannot operate a live queue.</p>
              </div>
              <button type="button" className="org-approval-back-btn" onClick={() => setActiveOrgId(null)}>
                <ArrowLeft size={16} /> {t("queue.backToOrgs")}
              </button>
            </div>
          )}

          {activeOrg.approvalStatus === "suspended" && (
            <div className="org-approval-banner suspended">
              <div className="org-approval-banner-icon"><AlertCircle size={20} /></div>
              <div className="org-approval-banner-content">
                <h3>Organization Suspended</h3>
                <p>Queue operations are temporarily suspended for this organization.</p>
              </div>
              <button type="button" className="org-approval-back-btn" onClick={() => setActiveOrgId(null)}>
                <ArrowLeft size={16} /> {t("queue.backToOrgs")}
              </button>
            </div>
          )}

          {isApproved && (
            <QueueBoard
              queueOrganizationUniqueId={activeOrg.queueOrganizationUniqueId}
              orgName={activeOrg.queueOrganizationName}
              orgType={activeOrg.queueOrganizationType}
              city={extractCity(activeOrg.queueOrganizationAddress)}
              origin={{
                latitude: activeOrg.latitude != null ? Number(activeOrg.latitude) : null,
                longitude: activeOrg.longitude != null ? Number(activeOrg.longitude) : null,
                description: activeOrg.queueOrganizationAddress,
              }}
              status={queueStatusData?.data}
              isLoading={statusLoading}
              onRefetch={refetchStatus}
              onBack={() => setActiveOrgId(null)}
            />
          )}
        </div>
      ) : (
        <div className="org-page-card">
          <div className="org-top-controls">
            <div className="org-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t("dashboard.searchOrgs")}
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
                <span>{t("dashboard.sort")}</span>
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

            <button
              type="button"
              className="org-btn-add"
              onClick={() => setShowCreateOrgModal(true)}
            >
              <Plus size={16} />
              <span>{t("dashboard.addOrgMobile", "Add")}</span>
            </button>
          </div>

          {orgsLoading && (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <div className="add-docs-spinner" style={{ width: 28, height: 28, margin: "0 auto 1rem" }} />
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>{t("common.loading")}</p>
            </div>
          )}

          {orgsError && (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#dc2626" }}>
              <AlertCircle size={32} style={{ margin: "0 auto 0.5rem" }} />
              <p style={{ fontWeight: 500 }}>Failed to load organizations</p>
              <button
                type="button"
                onClick={() => refetchOrgs()}
                style={{ marginTop: "0.75rem", padding: "0.4rem 1rem", border: "1px solid #dc2626", borderRadius: "0.375rem", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: "0.8125rem" }}
              >
                Retry
              </button>
            </div>
          )}

          {!orgsLoading && !orgsError && processedOrgs.length === 0 && (
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

          {/* Desktop Table & Mobile Cards */}
          {!orgsLoading && !orgsError && paginatedOrgs.length > 0 && (
            <>
              <div className="org-table-wrapper">
                <table className="org-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                        <span className="org-th-sortable">{t("dashboard.orgName")} <ChevronDown size={13} /></span>
                      </th>
                      <th onClick={() => handleSort("type")} style={{ cursor: "pointer" }}>
                        <span className="org-th-sortable">{t("dashboard.type")} <ChevronDown size={13} /></span>
                      </th>
                      <th onClick={() => handleSort("city")} style={{ cursor: "pointer" }}>
                        <span className="org-th-sortable">{t("dashboard.city")} <ChevronDown size={13} /></span>
                      </th>
                      <th>{t("dashboard.status")}</th>
                      <th onClick={() => handleSort("enabled")} style={{ cursor: "pointer" }}>
                        <span className="org-th-sortable">{t("dashboard.enabled")} <ChevronDown size={13} /></span>
                      </th>
                      <th style={{ textAlign: "center" }}>{t("queue.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrgs.map(({ organization: org }) => {
                      const city = extractCity(org.queueOrganizationAddress);
                      const status = String(org.approvalStatus || "pending").toLowerCase();
                      const isEnabled = org.queueEnabled === 1 ? "Yes" : "No";
                      const isOrgApproved = status === "approved";

                      return (
                        <tr key={org.queueOrganizationUniqueId}>
                          <td className="org-cell-name">{org.queueOrganizationName}</td>
                          <td className="org-cell-type">{org.queueOrganizationType}</td>
                          <td className="org-cell-city">{city}</td>
                          <td>
                            <span className={`org-status-text ${status}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                          <td>{isEnabled}</td>
                          <td>
                            <button
                              type="button"
                              className={`org-manage-link ${!isOrgApproved ? "disabled" : ""}`}
                              onClick={() => handleManage(org)}
                              disabled={!isOrgApproved}
                              title={!isOrgApproved ? `Cannot open queue: Organization is ${org.approvalStatus}` : "Manage Queue"}
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
            </>
          )}

          {/* Footer & Pagination */}
          {!orgsLoading && !orgsError && processedOrgs.length > 0 && (
            <div className="org-table-footer">
              <span>{t("dashboard.showOf", { current: paginatedOrgs.length, total: processedOrgs.length })}</span>
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
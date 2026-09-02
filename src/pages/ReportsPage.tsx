import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Building2,
  Check,
} from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import MobileHeader from "../components/common/MobileHeader";
import { OrgQueueDetailsModal } from "../components/queue/OrgQueueDetailsModal";
import {
  useListQueueOrganizationsQuery,
  useGetShipperRequestsQuery,
  useGetQueueStatusQuery,
} from "../lib/redux/api";
import { useQueueAdminStore } from "../store/queueAdminStore";
import type { QueueOrgListItem, QueueOrganization } from "../types/queue";
import { extractCity } from "../utils/formatters";
import "./ReportsPage.css";

const PAGE_SIZE = 5;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function OrgReportRow({
  org,
  onViewDetails,
}: {
  org: QueueOrganization;
  onViewDetails: (org: QueueOrganization) => void;
}) {
  const { t } = useTranslation();
  const { data: queueData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: org.queueOrganizationUniqueId },
    { skip: !org.queueOrganizationUniqueId }
  );

  const allEntries = useMemo(() => {
    if (!queueData?.data?.queues) return [];
    return Object.values(queueData.data.queues).flat();
  }, [queueData]);

  const waitingCount = allEntries.filter(
    (e) => !e.status || e.status === "waiting" || e.status === "offered"
  ).length;

  const totalDrivers = allEntries.length;

  const approvalStatusLower = (org.approvalStatus || "pending").toLowerCase();
  const isApproved = approvalStatusLower === "approved";
  const isPending = approvalStatusLower === "pending";

  const statusClass = isApproved ? "active" : isPending ? "pending" : "suspended";
  const displayStatus = isApproved
    ? t("dashboard.enabled", "Active")
    : isPending
      ? t("reports.pending", "Pending")
      : org.approvalStatus
        ? org.approvalStatus.charAt(0).toUpperCase() + org.approvalStatus.slice(1)
        : t("dashboard.enabled", "Active");

  const city = extractCity(org.queueOrganizationAddress);
  const displayLocation = city ? `${city}, Ethiopia` : (org.queueOrganizationAddress || "Ethiopia");

  return (
    <div className="rep-org-row">
      <div className="rep-org-main">
        <div className="rep-org-icon">
          <Building2 size={22} />
        </div>
        <div className="rep-org-info">
          <span className="rep-org-name">{org.queueOrganizationName}</span>
          <span className="rep-org-city">{displayLocation}</span>
          <span className={`rep-org-status ${statusClass}`}>{displayStatus}</span>
        </div>
      </div>

      <div className="rep-org-stat">
        <span className="rep-org-stat-label">{t("reports.drivers", "Drivers")}</span>
        <span className="rep-org-stat-val">{totalDrivers}</span>
      </div>

      <div className="rep-org-stat">
        <span className="rep-org-stat-label">{t("reports.waiting", "Waiting")}</span>
        <span className="rep-org-stat-val">{waitingCount}</span>
      </div>

      <div className="rep-org-action">
        <button
          type="button"
          onClick={() => onViewDetails(org)}
          className="rep-org-action-btn"
        >
          <span>{t("reports.viewQueue", "View Queue")}</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { t } = useTranslation();
  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);

  const [selectedOrgForDetails, setSelectedOrgForDetails] = useState<QueueOrganization | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "status">("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 1. Fetch Real Organizations
  const { data: rawOrgsData } = useListQueueOrganizationsQuery();
  const orgList: QueueOrgListItem[] = useMemo(() => {
    if (!rawOrgsData) return [];
    if (Array.isArray(rawOrgsData)) return rawOrgsData as QueueOrgListItem[];
    const payload = rawOrgsData as unknown as Record<string, unknown>;
    if (Array.isArray(payload.data)) return payload.data as QueueOrgListItem[];
    if (Array.isArray(payload.organizations)) return payload.organizations as QueueOrgListItem[];
    return [];
  }, [rawOrgsData]);

  // Determine active organization ID
  const activeOrgId =
    selectedOrgId && orgList.some((o) => o.organization.queueOrganizationUniqueId === selectedOrgId)
      ? selectedOrgId
      : orgList[0]?.organization?.queueOrganizationUniqueId || "";

  // 2. Fetch Real Queue Status for Active Terminal
  const { data: queueStatusData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId: activeOrgId },
    { skip: !activeOrgId }
  );

  // 4. Fetch Real Orders / Requests for Active Terminal
  const { data: ordersData } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId: activeOrgId, target: "all", limit: 100 },
    { skip: !activeOrgId }
  );
  const allOrders = useMemo(
    () => (Array.isArray(ordersData?.data) ? ordersData.data : []),
    [ordersData]
  );

  // Flatten all real queue entries
  const allQueueEntries = useMemo(() => {
    if (!queueStatusData?.data?.queues) return [];
    return Object.values(queueStatusData.data.queues).flat();
  }, [queueStatusData]);

  // Real Metric Calculations
  const totalOrgs = orgList.length;
  const activeOrgs = orgList.filter(
    (o) => String(o.organization.approvalStatus || "").toLowerCase() === "approved"
  ).length;

  const totalDriversCount = allQueueEntries.length;
  const totalOrdersCount = allOrders.length;

  // Real Driver Status Counts
  const waitingCount = allQueueEntries.filter((e) => !e.status || e.status === "waiting").length;
  const offeredCount = allQueueEntries.filter((e) => e.status === "offered").length;
  const loadedCount = allQueueEntries.filter(
    (e) => (e.status as string) === "loaded" || (e.status as string) === "assigned" || (e.status as string) === "completed"
  ).length;
  const totalQueueDrivers = allQueueEntries.length;

  // Real Percentages for Donut Chart
  const waitingPercent = totalQueueDrivers > 0 ? Math.round((waitingCount / totalQueueDrivers) * 100) : 0;
  const offeredPercent = totalQueueDrivers > 0 ? Math.round((offeredCount / totalQueueDrivers) * 100) : 0;
  const loadedPercent = totalQueueDrivers > 0 ? Math.max(0, 100 - waitingPercent - offeredPercent) : 0;

  // SVG Donut Chart Calculation
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const waitingStroke = (waitingPercent / 100) * circumference;
  const offeredStroke = (offeredPercent / 100) * circumference;
  const loadedStroke = (loadedPercent / 100) * circumference;

  const waitingOffset = 0;
  const offeredOffset = -waitingStroke;
  const loadedOffset = -(waitingStroke + offeredStroke);

  // Real Monthly Orders / Requests Data (12 months Jan-Dec)
  const currentMonthIdx = new Date().getMonth();
  const monthlyRequests = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (allOrders.length > 0) {
      allOrders.forEach((o) => {
        const dateStr = o.shipperRequest?.shipperRequestCreatedAt || o.shipperRequest?.shippingDate;
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

  // Filter & Sort Organizations
  const filteredOrgs = useMemo(() => {
    let list = [...orgList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.organization.queueOrganizationName.toLowerCase().includes(q) ||
          (item.organization.queueOrganizationAddress &&
            item.organization.queueOrganizationAddress.toLowerCase().includes(q))
      );
    }

    if (sortField === "status") {
      list.sort((a, b) =>
        (a.organization.approvalStatus || "").localeCompare(b.organization.approvalStatus || "")
      );
    } else {
      list.sort((a, b) =>
        a.organization.queueOrganizationName.localeCompare(b.organization.queueOrganizationName)
      );
    }

    return list;
  }, [orgList, searchQuery, sortField]);

  const totalPages = Math.ceil(filteredOrgs.length / PAGE_SIZE) || 1;
  const paginatedOrgs = filteredOrgs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <DashboardLayout
      title={t("reports.title", "Reports")}
      subtitle={t("reports.subtitle", "Analyze queue activity and operational performance")}
      activeTab="reports"
    >
      <div className="rep-container">
        {/* Mobile Navigation Header */}
        <div className="rep-mobile-top-header">
          <MobileHeader title={t("reports.title", "Reports")} showBack={false} />
          <p className="rep-mobile-subtitle">{t("reports.subtitle", "Analyze queue activity and operational performance")}</p>
        </div>
        {/* Top KPI Metric Cards (3 on mobile, 4 on desktop) */}
        <div className="rep-kpi-grid">
          <div className="rep-kpi-card">
            <span className="rep-kpi-label">{t("reports.totalDriver", "Total Driver")}</span>
            <span className="rep-kpi-val orange">{totalDriversCount}</span>
            <span className="rep-kpi-sub green">{t("reports.checkedIn", "Checked In")}</span>
          </div>

          <div className="rep-kpi-card">
            <span className="rep-kpi-label">{t("reports.waitingNow", "Waiting Now")}</span>
            <span className="rep-kpi-val blue">{waitingCount}</span>
            <span className="rep-kpi-sub blue">{t("reports.acrossQueues", "Across all queues")}</span>
          </div>

          <div className="rep-kpi-card">
            <span className="rep-kpi-label">{t("reports.ordersNow", "Orders Now")}</span>
            <span className="rep-kpi-val green">{totalOrdersCount}</span>
            <span className="rep-kpi-sub blue">{t("reports.created", "Created")}</span>
          </div>

          <div className="rep-kpi-card">
            <span className="rep-kpi-label">{t("reports.totalOrganizations", "Total Organizations")}</span>
            <span className="rep-kpi-val">{totalOrgs}</span>
            <span className="rep-kpi-sub green">
              {t("reports.activeCount", { count: activeOrgs, defaultValue: `Active (${activeOrgs})` })}
            </span>
          </div>
        </div>

        {/* Middle Charts Grid: Donut + Bar Chart */}
        <div className="rep-charts-grid">
          {/* Status Donut Chart (Desktop only) */}
          <div className="rep-chart-card">
            <h3 className="rep-card-title">{t("reports.status", "Status")}</h3>
            <div className="rep-donut-wrap">
              <div className="rep-donut-svg-box">
                <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />
                  {waitingStroke > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#16a34a"
                      strokeWidth="18"
                      strokeDasharray={`${waitingStroke} ${circumference}`}
                      strokeDashoffset={waitingOffset}
                    />
                  )}
                  {offeredStroke > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#ea580c"
                      strokeWidth="18"
                      strokeDasharray={`${offeredStroke} ${circumference}`}
                      strokeDashoffset={offeredOffset}
                    />
                  )}
                  {loadedStroke > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="#034b6e"
                      strokeWidth="18"
                      strokeDasharray={`${loadedStroke} ${circumference}`}
                      strokeDashoffset={loadedOffset}
                    />
                  )}
                </svg>
              </div>

              <div className="rep-legend-list">
                <div className="rep-legend-item">
                  <span className="rep-legend-dot waiting" />
                  <span>{t("reports.waiting", "Waiting")} ({waitingCount} • {waitingPercent}%)</span>
                </div>
                <div className="rep-legend-item">
                  <span className="rep-legend-dot offered" />
                  <span>{t("reports.offered", "Offered")} ({offeredCount} • {offeredPercent}%)</span>
                </div>
                <div className="rep-legend-item">
                  <span className="rep-legend-dot loaded" />
                  <span>{t("reports.loaded", "Loaded")} ({loadedCount} • {loadedPercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Number of Requests Bar Chart with Y-Axis */}
          <div className="rep-chart-card">
            <h3 className="rep-card-title">{t("reports.numberOfRequests", "Number of Requests")}</h3>
            <div className="rep-bar-header">
              <span className="rep-bar-total">{currentMonthRequests}</span>
            </div>

            <div className="rep-bar-chart-layout">
              {/* Dynamic Y-Axis markers */}
              <div className="rep-y-axis">
                <span>{maxMonthlyCount}</span>
                <span>{Math.round(maxMonthlyCount * 0.75)}</span>
                <span>{Math.round(maxMonthlyCount * 0.5)}</span>
                <span>{Math.round(maxMonthlyCount * 0.25)}</span>
                <span>0</span>
              </div>

              <div className="rep-bar-chart-container">
                {MONTH_NAMES.map((month, idx) => {
                  const val = monthlyRequests[idx] || 0;
                  const heightPercent = val > 0 ? Math.min(100, Math.max(12, (val / maxMonthlyCount) * 100)) : 4;
                  const isCurrentMonth = idx === currentMonthIdx;
                  const monthTranslated = t(`reports.months.${month}`, month);

                  return (
                    <div key={month} className="rep-bar-col">
                      <div
                        className={`rep-bar-pillar ${isCurrentMonth ? "active-month" : ""}`}
                        style={{ height: `${heightPercent}%` }}
                        title={t("reports.requestsCount", { month: monthTranslated, count: val, defaultValue: `${monthTranslated}: ${val} requests` })}
                      />
                      <span
                        className="rep-bar-label"
                        style={{
                          color: isCurrentMonth ? "#0284c7" : "#64748b",
                          fontWeight: isCurrentMonth ? 700 : 500,
                        }}
                      >
                        {monthTranslated}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Organizations Section matching Screenshot 2 */}
        <div className="rep-orgs-card">
          <h3 className="rep-orgs-title">{t("dashboard.newOrg", "New Organization")}</h3>

          <div className="rep-orgs-toolbar">
            <div className="rep-search-wrap">
              <Search size={16} className="rep-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t("reports.searchOrgs", "Search Organizations")}
                className="rep-search-input"
              />
            </div>

            <div className="rep-sort-container" ref={sortMenuRef}>
              <button
                type="button"
                className="rep-sort-btn"
                onClick={() => setShowSortDropdown((v) => !v)}
              >
                <span>{t("reports.sort", "Sort")}</span>
                <ChevronDown size={14} className={`rep-sort-chevron ${showSortDropdown ? "open" : ""}`} />
              </button>

              {showSortDropdown && (
                <div className="rep-sort-menu">
                  <button
                    type="button"
                    className={`rep-sort-menu-item ${sortField === "name" ? "active" : ""}`}
                    onClick={() => {
                      setSortField("name");
                      setShowSortDropdown(false);
                    }}
                  >
                    <span>{t("reports.sortName", "Name")}</span>
                    {sortField === "name" && <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    className={`rep-sort-menu-item ${sortField === "status" ? "active" : ""}`}
                    onClick={() => {
                      setSortField("status");
                      setShowSortDropdown(false);
                    }}
                  >
                    <span>{t("reports.sortStatus", "Status")}</span>
                    {sortField === "status" && <Check size={14} />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rep-org-list">
            {paginatedOrgs.length > 0 ? (
              paginatedOrgs.map((item) => (
                <OrgReportRow
                  key={item.organization.queueOrganizationUniqueId}
                  org={item.organization}
                  onViewDetails={(selected) => setSelectedOrgForDetails(selected)}
                />
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#64748b" }}>
                {t("reports.noOrgsFound", {
                  query: searchQuery,
                  defaultValue: `No organizations found matching "${searchQuery}"`,
                })}
              </div>
            )}
          </div>

          <div className="rep-pagination">
            <span className="rep-page-info">
              Show {paginatedOrgs.length} of {filteredOrgs.length}
            </span>

            <div className="rep-page-btns">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`rep-page-btn ${currentPage === pageNum ? "active" : ""}`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rep-page-btn next"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Queue Details Modal */}
        {selectedOrgForDetails && (
          <OrgQueueDetailsModal
            org={selectedOrgForDetails}
            onClose={() => setSelectedOrgForDetails(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default ReportsPage;

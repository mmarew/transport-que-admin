import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronDown, Check, ChevronRight } from "lucide-react";
import type { QueueOrgListItem, QueueOrganization } from "@/types/queue";
import { useClickOutside } from "@/hooks/useClickOutside";
import { OrgReportRow } from "./OrgReportRow";

const PAGE_SIZE = 5;

export interface OrgReportsListProps {
  orgList: QueueOrgListItem[];
  onViewDetails: (org: QueueOrganization) => void;
}

/**
 * OrgReportsList handles search filtering, sorting, pagination, and rendering
 * of the organization reports table.
 */
export function OrgReportsList({ orgList, onViewDetails }: OrgReportsListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "status">("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    sortMenuRef,
    () => setShowSortDropdown(false),
    showSortDropdown,
  );

  const filteredOrgs = useMemo(() => {
    let list = [...orgList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.organization.queueOrganizationName.toLowerCase().includes(q) ||
          (item.organization.queueOrganizationAddress &&
            item.organization.queueOrganizationAddress
              .toLowerCase()
              .includes(q)),
      );
    }

    if (sortField === "status") {
      list.sort((a, b) =>
        (a.organization.approvalStatus || "").localeCompare(
          b.organization.approvalStatus || "",
        ),
      );
    } else {
      list.sort((a, b) =>
        a.organization.queueOrganizationName.localeCompare(
          b.organization.queueOrganizationName,
        ),
      );
    }

    return list;
  }, [orgList, searchQuery, sortField]);

  const totalPages = Math.ceil(filteredOrgs.length / PAGE_SIZE) || 1;
  const paginatedOrgs = filteredOrgs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="rep-orgs-card">
      <h3 className="rep-orgs-title">
        {t("dashboard.newOrg", "New Organization")}
      </h3>

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
            <ChevronDown
              size={14}
              className={`rep-sort-chevron ${showSortDropdown ? "open" : ""}`}
            />
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
              onViewDetails={onViewDetails}
            />
          ))
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "2.5rem 1rem",
              color: "#64748b",
            }}
          >
            {t("reports.noOrgsFound", {
              query: searchQuery,
              defaultValue: `No organizations found matching "${searchQuery}"`,
            })}
          </div>
        )}
      </div>

      <div className="rep-pagination">
        <span className="rep-page-info">
          {t("dashboard.showOf", {
            current: paginatedOrgs.length,
            total: filteredOrgs.length,
          })}
        </span>

        <div className="rep-page-btns">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`rep-page-btn ${currentPage === pageNum ? "active" : ""}`}
              >
                {pageNum}
              </button>
            ),
          )}
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
  );
}

export default OrgReportsList;

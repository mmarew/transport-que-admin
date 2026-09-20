import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Plus, Search } from "lucide-react";

export type OrgSortField = "name" | "type" | "city" | "status" | "enabled";

interface OrgListToolbarProps {
  searchQuery: string;
  onSearchChange: (_query: string) => void;
  sortField: OrgSortField;
  onSort: (_field: OrgSortField) => void;
  onAdd: () => void;
}

const SORT_FIELDS: OrgSortField[] = ["name", "type", "city", "status", "enabled"];

export function OrgListToolbar({
  searchQuery,
  onSearchChange,
  sortField,
  onSort,
  onAdd,
}: OrgListToolbarProps) {
  const { t } = useTranslation();
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const SORT_LABELS: Record<OrgSortField, string> = {
    name: t("dashboard.orgName"),
    type: t("dashboard.type"),
    city: t("dashboard.city"),
    status: t("dashboard.status"),
    enabled: t("dashboard.enabled"),
  };

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      ) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className="org-top-controls">
      <div className="org-search-box">
        <Search size={16} className="search-icon" />
        <input
          id="dashboard-search-orgs"
          name="searchOrgs"
          type="text"
          placeholder={t("dashboard.searchOrgs")}
          aria-label={t("dashboard.searchOrgs")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
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
          <ChevronDown
            size={14}
            className={`org-sort-chevron ${showSortMenu ? "open" : ""}`}
          />
        </button>

        {showSortMenu && (
          <div className="org-sort-menu">
            {SORT_FIELDS.map((field) => (
              <button
                key={field}
                type="button"
                className={`org-sort-menu-item ${sortField === field ? "active" : ""}`}
                onClick={() => {
                  onSort(field);
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
        onClick={onAdd}
      >
        <Plus size={16} />
        <span>{t("dashboard.addOrgMobile", "Add")}</span>
      </button>
    </div>
  );
}
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, RotateCcw, Check, X } from "lucide-react";
import { insaTestGroups } from "@/data/insaStandard";
import type { ChecklistState, TestStatus } from "@/hooks/useSecurityChecklist";

interface SecurityChecklistProps {
  statuses: ChecklistState;
  groupStats: Record<string, { passed: number; failed: number; total: number }>;
  onSetStatus: (no: number, status: TestStatus) => void;
  onResetAll: () => void;
}

type StatusFilter = "all" | "pass" | "fail" | "untested";

export function SecurityChecklist({
  statuses,
  groupStats,
  onSetStatus,
  onResetAll,
}: SecurityChecklistProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return insaTestGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const matchesQuery = !query || item.text.toLowerCase().includes(query);
          const status = statuses[item.no] ?? "untested";
          const matchesStatus = statusFilter === "all" || status === statusFilter;
          return matchesQuery && matchesStatus;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery, statusFilter, statuses]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("security.checklist.filterAll", "All") },
    { key: "pass", label: t("security.checklist.pass", "Pass") },
    { key: "fail", label: t("security.checklist.fail", "Fail") },
    { key: "untested", label: t("security.checklist.untested", "Untested") },
  ];

  return (
    <div className="sec-focus-card">
      <div className="sec-checklist-head">
        <div>
          <h2 className="sec-card-title">
            {t("security.checklist.title", "Minimum Security Testing")}
          </h2>
          <p className="sec-card-subtitle">
            {t(
              "security.checklist.subtitle",
              "Annex B — record the result of each security test deployment",
            )}
          </p>
        </div>
        <button type="button" className="sec-reset-btn" onClick={onResetAll}>
          <RotateCcw size={15} />
          <span>{t("security.checklist.reset", "Reset all")}</span>
        </button>
      </div>

      <div className="sec-checklist-toolbar">
        <div className="sec-search-wrap">
          <Search size={16} className="sec-search-icon" />
          <input
            type="text"
            className="sec-search-input"
            placeholder={t("security.checklist.search", "Search tests...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sec-filter-pills">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`sec-filter-pill ${statusFilter === filter.key ? "active" : ""}`}
              onClick={() => setStatusFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <p className="sec-empty">
          {t("security.checklist.noResults", "No tests match your filters.")}
        </p>
      ) : (
        <div className="sec-test-groups">
          {filteredGroups.map((group) => {
            const stats = groupStats[group.id];
            const pct = stats ? Math.round(((stats.passed + stats.failed) / stats.total) * 100) : 0;
            return (
              <div key={group.id} className="sec-test-group">
                <div className="sec-test-group-head">
                  <h3 className="sec-test-group-title">{group.title}</h3>
                  {stats && (
                    <span className="sec-test-group-meta">
                      <span className="sec-meta-pass">{stats.passed}</span>
                      <span className="sec-meta-sep">/</span>
                      <span className="sec-meta-fail">{stats.failed}</span>
                      <span className="sec-meta-sep">/</span>
                      <span>{stats.total}</span>
                      <span className="sec-group-progress">
                        <span
                          className="sec-group-progress-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </span>
                  )}
                </div>
                <ul className="sec-test-list">
                  {group.items.map((item) => {
                    const status = statuses[item.no];
                    return (
                      <li key={item.no} className={`sec-test-item ${status ?? ""}`}>
                        <span className="sec-test-no">{item.no}</span>
                        <span className="sec-test-text">{item.text}</span>
                        <span className="sec-test-actions">
                          <button
                            type="button"
                            className={`sec-test-btn pass ${status === "pass" ? "active" : ""}`}
                            onClick={() => onSetStatus(item.no, "pass")}
                            title={t("security.checklist.pass", "Pass")}
                            aria-label={`${t("security.checklist.pass", "Pass")}: ${item.text}`}
                            aria-pressed={status === "pass"}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className={`sec-test-btn fail ${status === "fail" ? "active" : ""}`}
                            onClick={() => onSetStatus(item.no, "fail")}
                            title={t("security.checklist.fail", "Fail")}
                            aria-label={`${t("security.checklist.fail", "Fail")}: ${item.text}`}
                            aria-pressed={status === "fail"}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SecurityChecklist;

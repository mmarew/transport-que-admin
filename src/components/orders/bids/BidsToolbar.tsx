import { useTranslation } from "react-i18next";
import { Search, X, ArrowUpDown } from "lucide-react";

export type BidsSortOption =
  | "nearest"
  | "lowest-price"
  | "highest-price"
  | "name"
  | "default";

export interface BidsToolbarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  sortBy: BidsSortOption;
  onSortChange: (sort: BidsSortOption) => void;
  displayLimit: number;
  onDisplayLimitChange: (limit: number) => void;
  shownCount: number;
  totalFiltered: number;
  onShowAll: () => void;
}

/**
 * BidsToolbar provides search, sorting, display limit, and count bar for driver bids.
 */
export function BidsToolbar({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  displayLimit,
  onDisplayLimitChange,
  shownCount,
  totalFiltered,
  onShowAll,
}: BidsToolbarProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="dbm-toolbar">
        <div className="dbm-search-wrap">
          <Search size={14} className="dbm-search-icon" />
          <input
            type="text"
            className="dbm-search-input"
            placeholder={t(
              "orders.searchDriversPlaceholder",
              "Search by driver name, phone, or plate...",
            )}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="dbm-search-clear"
              onClick={() => onSearchChange("")}
              aria-label={t("common.clear", "Clear")}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="dbm-filters-wrap">
          <div className="dbm-filter-group">
            <ArrowUpDown size={13} className="dbm-filter-icon" />
            <select
              className="dbm-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as BidsSortOption)}
              aria-label={t("orders.sortBy", "Sort by")}
            >
              <option value="nearest">
                {t("orders.nearestFirst", "Nearest Distance First")}
              </option>
              <option value="lowest-price">
                {t("orders.lowestPriceFirst", "Lowest Offer First")}
              </option>
              <option value="highest-price">
                {t("orders.highestPriceFirst", "Highest Offer First")}
              </option>
              <option value="name">
                {t("orders.nameAZ", "Driver Name (A-Z)")}
              </option>
              <option value="default">
                {t("orders.defaultOrder", "Default Order")}
              </option>
            </select>
          </div>

          <div className="dbm-filter-group">
            <select
              className="dbm-select dbm-select--limit"
              value={displayLimit}
              onChange={(e) => onDisplayLimitChange(Number(e.target.value))}
              aria-label="Display Limit"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={0}>{t("orders.showAll", "All")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dbm-showing-bar">
        <span className="dbm-showing-text">
          {t("orders.showingDrivers", {
            shown: shownCount,
            total: totalFiltered,
            defaultValue: `Showing ${shownCount} of ${totalFiltered} drivers`,
          })}
        </span>
        {totalFiltered > shownCount && (
          <button
            type="button"
            className="dbm-btn-show-more"
            onClick={onShowAll}
          >
            {t("orders.showAll", "Show All")} ({totalFiltered})
          </button>
        )}
      </div>
    </>
  );
}

export default BidsToolbar;

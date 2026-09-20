import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";

interface OrgListPaginationProps {
  page: number;
  totalPages: number;
  pageCount: number;
  totalCount: number;
  onPageChange: (_page: number) => void;
}

export function OrgListPagination({
  page,
  totalPages,
  pageCount,
  totalCount,
  onPageChange,
}: OrgListPaginationProps) {
  const { t } = useTranslation();

  return (
    <div className="org-table-footer">
      <span>
        {t("dashboard.showOf", {
          current: pageCount,
          total: totalCount,
        })}
      </span>
      <div className="org-pagination">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={`org-page-btn ${page === p ? "active" : ""}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        {totalPages > 1 && (
          <button
            type="button"
            className="org-page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            title={t("common.nextPage")}
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
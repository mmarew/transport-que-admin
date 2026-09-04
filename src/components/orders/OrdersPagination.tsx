import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OrdersPaginationProps {
  isLoading: boolean;
  totalFiltered: number;
  totalShown: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function OrdersPagination({
  isLoading,
  totalFiltered,
  totalShown,
  currentPage,
  totalPages,
  onPageChange,
}: OrdersPaginationProps) {
  const { t } = useTranslation();

  if (isLoading || totalFiltered === 0) return null;

  return (
    <div className="orders-table-footer">
      <span>
        {t("dashboard.showOf", {
          current: totalShown,
          total: totalFiltered,
        })}
      </span>
      <div className="orders-pagination">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            className={`orders-page-btn ${currentPage === page ? "active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
        {totalPages > 1 && (
          <button
            type="button"
            className="orders-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

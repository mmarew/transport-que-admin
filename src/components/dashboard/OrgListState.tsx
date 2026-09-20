import { useTranslation } from "react-i18next";
import { AlertCircle, Building2 } from "lucide-react";

interface OrgListStateProps {
  state: "loading" | "error" | "empty";
  searchQuery?: string;
  onRetry?: () => void;
}

export function OrgListState({ state, searchQuery, onRetry }: OrgListStateProps) {
  const { t } = useTranslation();

  if (state === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div
          className="add-docs-spinner"
          style={{ width: 28, height: 28, margin: "0 auto 1rem" }}
        />
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem 1rem",
          color: "#dc2626",
        }}
      >
        <AlertCircle size={32} style={{ margin: "0 auto 0.5rem" }} />
        <p style={{ fontWeight: 500 }}>{t("dashboard.failedToLoadOrgs")}</p>
        <button
          type="button"
          onClick={onRetry}
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
          {t("dashboard.retry")}
        </button>
      </div>
    );
  }

  const isSearching = Boolean(searchQuery);
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <Building2
        size={36}
        color="#94a3b8"
        style={{ margin: "0 auto 0.75rem" }}
      />
      <h3
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#1e293b",
          margin: 0,
        }}
      >
        {isSearching ? t("dashboard.noMatching") : t("dashboard.noOrgs")}
      </h3>
      <p
        style={{
          color: "#64748b",
          fontSize: "0.875rem",
          marginTop: "0.25rem",
        }}
      >
        {isSearching ? t("dashboard.tryDifferent") : t("dashboard.registeredAppear")}
      </p>
    </div>
  );
}
import { useTranslation } from "react-i18next";
import { Truck } from "lucide-react";
import type { DriverQueueEntry } from "../../../types/queue";
import { OrgQueueDesktopTable } from "./OrgQueueDesktopTable";
import { OrgQueueMobileCards } from "./OrgQueueMobileCards";

export interface OrgQueueDriversListProps {
  entries: DriverQueueEntry[];
  isLoading: boolean;
}

export function OrgQueueDriversList({
  entries,
  isLoading,
}: OrgQueueDriversListProps) {
  const { t } = useTranslation();

  return (
    <div className="od-table-container">
      {isLoading ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "#64748b",
          }}
        >
          <div
            className="add-docs-spinner"
            style={{ width: 26, height: 26, margin: "0 auto 0.75rem" }}
          />
          <span style={{ fontSize: "0.875rem" }}>
            {t("common.loading", "Loading...")}
          </span>
        </div>
      ) : entries.length > 0 ? (
        <>
          <OrgQueueDesktopTable entries={entries} />
          <OrgQueueMobileCards entries={entries} />
        </>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 1rem",
            color: "#94a3b8",
          }}
        >
          <Truck size={32} style={{ margin: "0 auto 0.5rem", opacity: 0.6 }} />
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            {t(
              "reports.noDriversInQueue",
              "No drivers currently registered in this queue."
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default OrgQueueDriversList;

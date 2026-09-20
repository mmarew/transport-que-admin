import { useState } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../components/layout/DashboardLayout";
import MobileHeader from "../../components/common/MobileHeader";
import { OrgQueueDetailsModal } from "../../components/queue/OrgQueueDetailsModal";
import type { QueueOrganization } from "../../types/queue";
import { useReportsMetrics } from "../../hooks/useReportsMetrics";
import { KpiCards } from "../../components/reports/KpiCards";
import { DonutChart } from "../../components/reports/DonutChart";
import { MonthlyBarChart } from "../../components/reports/MonthlyBarChart";
import { OrgReportsList } from "../../components/reports/OrgReportsList";
import "./ReportsPage.css";

export function ReportsPage() {
  const { t } = useTranslation();
  const [selectedOrgForDetails, setSelectedOrgForDetails] =
    useState<QueueOrganization | null>(null);

  const {
    orgList,
    totalOrgs,
    activeOrgs,
    totalDriversCount,
    totalOrdersCount,
    waitingCount,
    offeredCount,
    loadedCount,
    waitingPercent,
    offeredPercent,
    loadedPercent,
    monthlyRequests,
    currentMonthIdx,
    currentMonthRequests,
    maxMonthlyCount,
  } = useReportsMetrics();

  return (
    <DashboardLayout
      title={t("reports.title", "Reports")}
      subtitle={t(
        "reports.subtitle",
        "Analyze queue activity and operational performance",
      )}
      activeTab="reports"
    >
      <div className="rep-container">
        {/* Mobile Navigation Header */}
        <div className="rep-mobile-top-header">
          <MobileHeader title={t("reports.title", "Reports")} showBack={false} />
          <p className="rep-mobile-subtitle">
            {t(
              "reports.subtitle",
              "Analyze queue activity and operational performance",
            )}
          </p>
        </div>

        {/* Top KPI Metric Cards */}
        <KpiCards
          totalDriversCount={totalDriversCount}
          waitingCount={waitingCount}
          totalOrdersCount={totalOrdersCount}
          totalOrgs={totalOrgs}
          activeOrgs={activeOrgs}
        />

        {/* Middle Charts Grid: Donut + Bar Chart */}
        <div className="rep-charts-grid">
          <DonutChart
            waitingCount={waitingCount}
            waitingPercent={waitingPercent}
            offeredCount={offeredCount}
            offeredPercent={offeredPercent}
            loadedCount={loadedCount}
            loadedPercent={loadedPercent}
          />

          <MonthlyBarChart
            currentMonthRequests={currentMonthRequests}
            maxMonthlyCount={maxMonthlyCount}
            monthlyRequests={monthlyRequests}
            currentMonthIdx={currentMonthIdx}
          />
        </div>

        {/* Organizations Report Table */}
        <OrgReportsList
          orgList={orgList}
          onViewDetails={(selected) => setSelectedOrgForDetails(selected)}
        />

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

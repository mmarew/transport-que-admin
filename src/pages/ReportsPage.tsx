import DashboardLayout from "../components/layout/DashboardLayout";

export function ReportsPage() {
  return (
    <DashboardLayout
      title="Reports"
      subtitle="View throughput performance, average waiting times, and dispatch logs"
      activeTab="reports"
    />
  );
}

export default ReportsPage;

import DashboardLayout from "../components/layout/DashboardLayout";

export function QueueDashboardPage() {
  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Select an organization to manage its queue"
      activeTab="dashboard"
    >
      {/* Intentionally left clean per design request */}
    </DashboardLayout>
  );
}

export default QueueDashboardPage;
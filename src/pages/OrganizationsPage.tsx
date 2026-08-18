import DashboardLayout from "../components/layout/DashboardLayout";

export function OrganizationsPage() {
  return (
    <DashboardLayout
      title="Organizations"
      subtitle="Manage terminal queue stations, checkpoints, and dispatch locations"
      activeTab="organizations"
    />
  );
}

export default OrganizationsPage;

import DashboardLayout from "../components/layout/DashboardLayout";

export function SettingsPage() {
  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage your queue admin profile, alert thresholds, and operational preferences"
      activeTab="settings"
    />
  );
}

export default SettingsPage;

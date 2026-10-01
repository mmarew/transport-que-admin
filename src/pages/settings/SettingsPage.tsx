import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useListQueueOrganizationsQuery } from "../../lib/redux/api";
import { setAppLanguage, getAppLanguage } from "../../i18n";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useQueueAdminStore } from "../../store/queueAdminStore";
import type { RootState } from "../../lib/redux/store";
import type { QueueOrgListItem } from "../../types/queue";
import { normalizeOrgList } from "../../utils/formatters";
import {
  DesktopProfileSection,
  type SettingsProfileFormData,
} from "../../components/settings/DesktopProfileSection";
import { DesktopPreferences } from "../../components/settings/DesktopPreferences";
import { DangerZone } from "../../components/settings/DangerZone";
import { DeleteAccountModal } from "../../components/settings/DeleteAccountModal";
import { MobileSettingsView } from "../../components/settings/MobileSettingsView";
import "./SettingsPage.css";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const { logout } = useAuth();

  const authData = useSelector((state: RootState) => state.auth.auth);
  const user = authData?.userData;

  const selectedOrgId = useQueueAdminStore((s) => s.selectedOrgId);
  const { data: rawOrgsData } = useListQueueOrganizationsQuery();

  const orgList: QueueOrgListItem[] = useMemo(() => {
    return normalizeOrgList(rawOrgsData);
  }, [rawOrgsData]);

  const activeOrg = useMemo(() => {
    return (
      orgList.find(
        (item) => item.organization?.queueOrganizationUniqueId === selectedOrgId,
      )?.organization ||
      orgList[0]?.organization ||
      null
    );
  }, [orgList, selectedOrgId]);

  // Derived user and org info
  const displayName =
    activeOrg?.queueOrganizationName || user?.fullName || "Queue Terminal";
  const displayPhone =
    activeOrg?.queueOrganizationPhone || user?.phoneNumber || "+251929257881";
  const displayEmail = user?.email || "admin@transportque.com";
  const displayAddress =
    activeOrg?.queueOrganizationAddress || "Dessie, Amhara Region, Ethiopia";

  // Form edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<SettingsProfileFormData>({
    name: displayName,
    phone: displayPhone,
    email: displayEmail,
    address: displayAddress,
  });

  const prevDefaultsRef = useRef({
    displayName,
    displayPhone,
    displayEmail,
    displayAddress,
  });

  useEffect(() => {
    if (!isEditing) {
      if (
        prevDefaultsRef.current.displayName !== displayName ||
        prevDefaultsRef.current.displayPhone !== displayPhone ||
        prevDefaultsRef.current.displayEmail !== displayEmail ||
        prevDefaultsRef.current.displayAddress !== displayAddress
      ) {
        prevDefaultsRef.current = {
          displayName,
          displayPhone,
          displayEmail,
          displayAddress,
        };
        setFormData({
          name: displayName,
          phone: displayPhone,
          email: displayEmail,
          address: displayAddress,
        });
      }
    }
  }, [displayName, displayPhone, displayEmail, displayAddress, isEditing]);

  /**
   * Push / email / 2FA have no backend endpoint and no notification-preference
   * table, so they are display-only. They are NOT persisted to localStorage:
   * a flag that only ever lives in one browser tab looks like a setting while
   * changing nothing anywhere else. The controls are disabled instead, and the
   * values below are only the local starting display.
   */
  const [pushNotif] = useState(true);
  const [emailNotif] = useState(true);
  const [twoFactor] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMobileProfile, setShowMobileProfile] = useState(false);

  // There is no PUT/PATCH profile endpoint, so saving is refused rather than
  // acknowledged. Reporting success here was the worst of the no-ops: the user
  // believed their phone and email had been updated and had not.
  const handleSaveProfile = () => {
    toast.info(t("settings.profileUpdateUnavailable"));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: displayName,
      phone: displayPhone,
      email: displayEmail,
      address: displayAddress,
    });
  };

  // Each of these is disabled in the UI. The handlers remain only so a
  // programmatic call cannot silently fake a change.
  const notAvailableReason = t("settings.notAvailableNotice");
  const unavailable = () => toast.info(notAvailableReason);

  const handleTogglePush = (_val: boolean) => unavailable();
  const handleToggleEmail = (_val: boolean) => unavailable();
  const handleToggle2FA = (_val: boolean) => unavailable();

  const handleToggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    toast.info(val ? "Dark mode activated" : "Light mode activated");
  };

  const handleLanguageChange = (lang: "en" | "am") => {
    setAppLanguage(lang);
    toast.success(
      t("settings.langSwitched", {
        language: lang === "en" ? "English" : "አማርኛ",
      }),
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success(t("common.logout"));
  };

  // Honest about not being implemented, which D3 credits as the right call —
  // kept, but routed through i18n like everything else.
  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    toast.error(t("settings.deleteRequiresAdmin"));
  };

  const currentLang = (i18n.language || getAppLanguage() || "en") as
    | "en"
    | "am";

  return (
    <DashboardLayout
      title={t("settings.title")}
      subtitle={t("settings.subtitle")}
      activeTab="settings"
    >
      <div className="settings-container">
        <p className="settings-notice" role="status">
          {t("settings.notAvailableNotice")}
        </p>

        {/* Mobile Settings View (<= 768px) */}
        <MobileSettingsView
          showMobileProfile={showMobileProfile}
          setShowMobileProfile={setShowMobileProfile}
          displayName={displayName}
          formData={formData}
          isEditing={isEditing}
          onChangeFormData={setFormData}
          onStartEdit={() => setIsEditing(true)}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveProfile}
          pushNotif={pushNotif}
          emailNotif={emailNotif}
          twoFactor={twoFactor}
          darkMode={darkMode}
          currentLang={currentLang}
          onTogglePush={handleTogglePush}
          onToggleEmail={handleToggleEmail}
          onToggle2FA={handleToggle2FA}
          onToggleDarkMode={handleToggleDarkMode}
          onLanguageChange={handleLanguageChange}
          onLogout={handleLogout}
          onDeleteAccount={() => setShowDeleteModal(true)}
        />

        {/* Desktop Settings View (> 768px) */}
        <div className="settings-desktop">
          <div className="sdt-card">
            <DesktopProfileSection
              displayName={displayName}
              formData={formData}
              isEditing={isEditing}
              onChangeFormData={setFormData}
              onStartEdit={() => setIsEditing(true)}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveProfile}
              saveDisabledReason={notAvailableReason}
            />

            <DesktopPreferences
              pushNotif={pushNotif}
              emailNotif={emailNotif}
              twoFactor={twoFactor}
              darkMode={darkMode}
              currentLang={currentLang}
              onTogglePush={handleTogglePush}
              onToggleEmail={handleToggleEmail}
              onToggle2FA={handleToggle2FA}
              onToggleDarkMode={handleToggleDarkMode}
              onLanguageChange={handleLanguageChange}
              disabledReason={notAvailableReason}
            />

            <DangerZone
              onLogout={handleLogout}
              onDeleteAccount={() => setShowDeleteModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}

export default SettingsPage;

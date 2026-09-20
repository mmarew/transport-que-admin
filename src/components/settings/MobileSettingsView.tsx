import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogOut, Search } from "lucide-react";
import type { SettingsProfileFormData } from "./DesktopProfileSection";
import { MobileProfileView } from "./MobileProfileView";
import { MobileAccountSection } from "./MobileAccountSection";
import { MobilePreferencesSection } from "./MobilePreferencesSection";
import { MobileMoreSection } from "./MobileMoreSection";

export interface MobileSettingsViewProps {
  showMobileProfile: boolean;
  setShowMobileProfile: (show: boolean) => void;
  displayName: string;
  formData: SettingsProfileFormData;
  isEditing: boolean;
  onChangeFormData: (data: SettingsProfileFormData) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  pushNotif: boolean;
  emailNotif: boolean;
  twoFactor: boolean;
  darkMode: boolean;
  currentLang: "en" | "am";
  onTogglePush: (val: boolean) => void;
  onToggleEmail: (val: boolean) => void;
  onToggle2FA: (val: boolean) => void;
  onToggleDarkMode: (val: boolean) => void;
  onLanguageChange: (lang: "en" | "am") => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

/**
 * MobileSettingsView renders the mobile view (<=768px), composing focused section components.
 */
export function MobileSettingsView({
  showMobileProfile,
  setShowMobileProfile,
  displayName,
  formData,
  isEditing,
  onChangeFormData,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  pushNotif,
  emailNotif,
  twoFactor,
  darkMode,
  currentLang,
  onTogglePush,
  onToggleEmail,
  onToggle2FA,
  onToggleDarkMode,
  onLanguageChange,
  onLogout,
  onDeleteAccount,
}: MobileSettingsViewProps) {
  const { t } = useTranslation();

  if (showMobileProfile) {
    return (
      <MobileProfileView
        displayName={displayName}
        formData={formData}
        isEditing={isEditing}
        onChangeFormData={onChangeFormData}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onSaveEdit={onSaveEdit}
        onBack={() => {
          onCancelEdit();
          setShowMobileProfile(false);
        }}
      />
    );
  }

  return (
    <div className="settings-mobile" aria-label={t("settings.screenAria")}>
      {/* Header */}
      <div className="settings-header">
        <h1 className="settings-header__title">{t("settings.title")}</h1>
        <button
          type="button"
          className="settings-header__search-btn"
          onClick={() => toast.info("Search")}
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Account Section */}
      <MobileAccountSection onOpenProfile={() => setShowMobileProfile(true)} />

      {/* Theme & Preferences Section */}
      <MobilePreferencesSection
        pushNotif={pushNotif}
        emailNotif={emailNotif}
        twoFactor={twoFactor}
        darkMode={darkMode}
        onTogglePush={onTogglePush}
        onToggleEmail={onToggleEmail}
        onToggle2FA={onToggle2FA}
        onToggleDarkMode={onToggleDarkMode}
      />

      {/* More Settings Section */}
      <MobileMoreSection
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
      />

      {/* Action Buttons */}
      <div className="settings-actions">
        <button
          type="button"
          className="settings-actions__logout"
          onClick={onLogout}
        >
          <LogOut size={18} />
          {t("settings.signOut")}
        </button>

        <button
          type="button"
          className="settings-actions__delete"
          onClick={onDeleteAccount}
        >
          {t("settings.deleteAccount")}
        </button>
      </div>
    </div>
  );
}

export default MobileSettingsView;

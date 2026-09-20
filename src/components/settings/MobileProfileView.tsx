import { useTranslation } from "react-i18next";
import { Edit2 } from "lucide-react";
import MobileHeader from "@/components/common/MobileHeader";
import type { SettingsProfileFormData } from "./DesktopProfileSection";

export interface MobileProfileViewProps {
  displayName: string;
  formData: SettingsProfileFormData;
  isEditing: boolean;
  onChangeFormData: (data: SettingsProfileFormData) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onBack: () => void;
}

/**
 * MobileProfileView renders the mobile profile editing sub-page screen.
 */
export function MobileProfileView({
  displayName,
  formData,
  isEditing,
  onChangeFormData,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onBack,
}: MobileProfileViewProps) {
  const { t } = useTranslation();

  return (
    <div className="settings-mobile-profile-view animate-fade-in">
      <MobileHeader title={t("settings.myProfile")} onBack={onBack} />

      <div className="smp-content">
        {/* Avatar Section */}
        <div className="smp-avatar-section">
          <div className="smp-avatar-wrap">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || displayName)}&background=0B4D6D&color=ffffff&size=128`}
              alt={formData.name || displayName}
              className="smp-avatar-img"
            />
          </div>
          <h2 className="smp-name">{formData.name || displayName}</h2>
          <p className="smp-role">{t("settings.role")}</p>
        </div>

        {/* Profile Details Form */}
        <div className="smp-form">
          <div className="smp-field">
            <label className="smp-label">{t("settings.orgName")}</label>
            <input
              type="text"
              className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
              value={formData.name}
              onChange={(e) =>
                onChangeFormData({ ...formData, name: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.orgNamePlaceholder")}
            />
          </div>

          <div className="smp-field">
            <label className="smp-label">{t("settings.phone")}</label>
            <input
              type="tel"
              className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
              value={formData.phone}
              onChange={(e) =>
                onChangeFormData({ ...formData, phone: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.phonePlaceholder")}
            />
          </div>

          <div className="smp-field">
            <label className="smp-label">{t("settings.email")}</label>
            <input
              type="email"
              className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
              value={formData.email}
              onChange={(e) =>
                onChangeFormData({ ...formData, email: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.emailPlaceholder")}
            />
          </div>

          <div className="smp-field">
            <label className="smp-label">{t("settings.address")}</label>
            <input
              type="text"
              className={`smp-input ${!isEditing ? "smp-input--readonly" : ""}`}
              value={formData.address}
              onChange={(e) =>
                onChangeFormData({ ...formData, address: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.addressPlaceholder")}
            />
          </div>

          <div className="smp-actions">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="smp-btn-cancel"
                  onClick={onCancelEdit}
                >
                  {t("settings.cancel")}
                </button>
                <button
                  type="button"
                  className="smp-btn-save"
                  onClick={onSaveEdit}
                >
                  {t("settings.saveChanges")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="smp-btn-edit-profile"
                onClick={onStartEdit}
              >
                <Edit2 size={16} />
                <span>{t("common.edit", "Edit Profile")}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileProfileView;

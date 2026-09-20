import { useTranslation } from "react-i18next";
import { Edit2, X } from "lucide-react";

export interface SettingsProfileFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface DesktopProfileSectionProps {
  displayName: string;
  formData: SettingsProfileFormData;
  isEditing: boolean;
  onChangeFormData: (data: SettingsProfileFormData) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

/**
 * DesktopProfileSection renders the desktop avatar display and editable profile form fields.
 */
export function DesktopProfileSection({
  displayName,
  formData,
  isEditing,
  onChangeFormData,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: DesktopProfileSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* ── Avatar Row ── */}
      <div className="sdt-avatar-row">
        <div className="sdt-avatar-wrap">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=034b6e&color=ffffff&size=128`}
            alt={displayName}
            className="sdt-avatar-img"
          />
          <button
            type="button"
            className={`sdt-avatar-edit ${isEditing ? "sdt-avatar-edit--active" : ""}`}
            title={isEditing ? t("settings.cancel") : t("common.edit")}
            onClick={() => (isEditing ? onCancelEdit() : onStartEdit())}
          >
            {isEditing ? <X size={13} /> : <Edit2 size={13} />}
          </button>
        </div>
        <div>
          <div className="sdt-avatar-name">{displayName}</div>
          <div className="sdt-avatar-role">{t("settings.role")}</div>
        </div>
      </div>

      {/* ── Account Details Form ── */}
      <div className="sdt-section">
        <h3 className="sdt-section__title">{t("settings.accountDetails")}</h3>
        <div className="sdt-form-grid">
          <div className="sdt-form-field">
            <label className="sdt-form-label">{t("settings.orgName")}</label>
            <input
              type="text"
              className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
              value={formData.name}
              onChange={(e) =>
                onChangeFormData({ ...formData, name: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.orgNamePlaceholder")}
            />
          </div>

          <div className="sdt-form-field">
            <label className="sdt-form-label">{t("settings.phone")}</label>
            <input
              type="tel"
              className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
              value={formData.phone}
              onChange={(e) =>
                onChangeFormData({ ...formData, phone: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.phonePlaceholder")}
            />
          </div>

          <div className="sdt-form-field">
            <label className="sdt-form-label">{t("settings.email")}</label>
            <input
              type="email"
              className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
              value={formData.email}
              onChange={(e) =>
                onChangeFormData({ ...formData, email: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.emailPlaceholder")}
            />
          </div>

          <div className="sdt-form-field">
            <label className="sdt-form-label">{t("settings.address")}</label>
            <input
              type="text"
              className={`sdt-form-input ${!isEditing ? "sdt-form-input--readonly" : ""}`}
              value={formData.address}
              onChange={(e) =>
                onChangeFormData({ ...formData, address: e.target.value })
              }
              readOnly={!isEditing}
              placeholder={t("settings.addressPlaceholder")}
            />
          </div>
        </div>

        {isEditing && (
          <div className="sdt-form-actions animate-fade-in">
            <button
              type="button"
              className="sdt-btn-save"
              onClick={onSaveEdit}
            >
              {t("settings.saveChanges")}
            </button>
            <button
              type="button"
              className="sdt-btn-cancel"
              onClick={onCancelEdit}
            >
              {t("settings.cancel")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default DesktopProfileSection;

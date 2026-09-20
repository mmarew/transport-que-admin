import { useTranslation } from "react-i18next";
import { LogOut, Trash2 } from "lucide-react";

export interface DangerZoneProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
}

/**
 * DangerZone displays the Sign Out and Delete Account actions on desktop settings.
 */
export function DangerZone({ onLogout, onDeleteAccount }: DangerZoneProps) {
  const { t } = useTranslation();

  return (
    <div className="sdt-danger-section">
      <button type="button" className="sdt-btn-logout" onClick={onLogout}>
        <LogOut size={16} />
        {t("settings.signOut")}
      </button>

      <button
        type="button"
        className="sdt-btn-delete"
        onClick={onDeleteAccount}
      >
        <Trash2 size={16} />
        {t("settings.deleteAccount")}
      </button>
    </div>
  );
}

export default DangerZone;

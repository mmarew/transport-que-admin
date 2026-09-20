import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

export interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * DeleteAccountModal renders the confirmation dialog for account deletion.
 */
export function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="qm"
      role="alertdialog"
      containerClassName="qm-modal--sm"
    >
      <div className="qm-header">
        <div>
          <h2 className="qm-title" style={{ color: "#dc2626" }}>
            {t("settings.deleteConfirmTitle")}
          </h2>
          <p className="qm-subtitle">{t("settings.deleteConfirmDesc")}</p>
        </div>
      </div>

      <div className="qm-footer" style={{ marginTop: "20px" }}>
        <button type="button" onClick={onClose} className="qm-btn-cancel">
          {t("settings.cancel")}
        </button>
        <button type="button" onClick={onConfirm} className="qm-btn-danger">
          {t("settings.confirmDelete")}
        </button>
      </div>
    </Modal>
  );
}

export default DeleteAccountModal;

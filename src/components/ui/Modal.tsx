import React, { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useModalA11y } from "@/hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string | ReactNode;
  subtitle?: ReactNode;
  mobileHeaderTitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "com" | "qm" | "dm" | "org" | "orders";
  size?: "sm" | "md" | "lg" | "xl";
  containerClassName?: string;
  role?: "dialog" | "alertdialog";
  hideCloseButton?: boolean;
  closeButtonLabel?: string;
  style?: React.CSSProperties;
}

const VARIANT_CLASS_MAP: Record<
  NonNullable<ModalProps["variant"]>,
  {
    overlay: string;
    container: string;
    mobileHeader: string;
    header: string;
    title: string;
    subtitle: string;
    closeBtn: string;
  }
> = {
  com: {
    overlay: "com-overlay",
    container: "com-modal",
    mobileHeader: "com-mobile-header",
    header: "com-header com-header--desktop",
    title: "com-title",
    subtitle: "com-subtitle",
    closeBtn: "com-close-btn",
  },
  qm: {
    overlay: "qm-overlay",
    container: "qm-modal",
    mobileHeader: "qm-mobile-header",
    header: "qm-header qm-header--desktop",
    title: "qm-title",
    subtitle: "qm-subtitle",
    closeBtn: "qm-close-btn",
  },
  dm: {
    overlay: "dm-overlay",
    container: "dm-modal",
    mobileHeader: "dm-mobile-header",
    header: "dm-header dm-header--desktop",
    title: "dm-title",
    subtitle: "dm-subtitle",
    closeBtn: "dm-close-btn",
  },
  org: {
    overlay: "org-modal-overlay",
    container: "org-modal",
    mobileHeader: "org-mobile-header",
    header: "org-modal-header",
    title: "org-modal-title",
    subtitle: "org-modal-subtitle",
    closeBtn: "org-modal-close-btn",
  },
  orders: {
    overlay: "orders-modal-overlay",
    container: "orders-modal-content",
    mobileHeader: "orders-mobile-header",
    header: "orders-modal-header",
    title: "orders-modal-title",
    subtitle: "orders-modal-subtitle",
    closeBtn: "orders-modal-close-btn",
  },
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  mobileHeaderTitle,
  children,
  footer,
  variant = "com",
  size,
  containerClassName = "",
  role = "dialog",
  hideCloseButton = false,
  closeButtonLabel,
  style,
}: ModalProps) {
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: open, onClose });

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const classes = VARIANT_CLASS_MAP[variant] || VARIANT_CLASS_MAP.com;
  const sizeClass = size ? `${classes.container}--${size}` : "";
  const finalContainerClass = [classes.container, sizeClass, containerClassName]
    .filter(Boolean)
    .join(" ");

  const mobileTitle =
    mobileHeaderTitle || (typeof title === "string" ? title : "");

  return createPortal(
    <div
      className={classes.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={finalContainerClass}
        ref={modalRef}
        role={role}
        aria-modal="true"
        style={style}
      >
        {mobileTitle ? (
          <div className={classes.mobileHeader}>
            <MobileHeader title={mobileTitle} onBack={onClose} />
          </div>
        ) : null}

        {title || !hideCloseButton ? (
          <div className={classes.header}>
            <div>
              {title ? <h2 className={classes.title}>{title}</h2> : null}
              {subtitle ? <p className={classes.subtitle}>{subtitle}</p> : null}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                className={classes.closeBtn}
                onClick={onClose}
                aria-label={closeButtonLabel || t("common.closeModal", "Close")}
              >
                <X size={20} />
              </button>
            )}
          </div>
        ) : null}

        {children}

        {footer ? <div className="modal-footer-cluster">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;

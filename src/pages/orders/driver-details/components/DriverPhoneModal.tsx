import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Phone, Copy, Check, X } from "lucide-react";
import "./DriverPhonePopover.css";

export interface DriverPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone?: string | null;
  driverName?: string | null;
  companyName?: string | null;
  driverId?: string | null;
  plateNumber?: string | null;
}

export const DriverPhoneModal: React.FC<DriverPhoneModalProps> = ({
  isOpen,
  onClose,
  phone,
  companyName,
}) => {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const safePhone: string = phone ?? "";
  const displayPhone = safePhone && safePhone !== "—" ? safePhone : "Not available";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!safePhone || safePhone === "—") return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(safePhone);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = safePhone;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return createPortal(
    <div
      className="driver-phone-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Driver Contact"
    >
      <div
        className="driver-phone-popover driver-phone-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="driver-phone-popover-header">
          <button
            type="button"
            className="driver-phone-popover-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>

        {/* Driver Contact Card */}
        <div className="driver-phone-popover-card">
          <div className="driver-phone-popover-driver-row">
            <div className="driver-phone-popover-driver-info">
              <Phone size={13} className="driver-phone-popover-icon" />
              <span className="driver-phone-popover-label">Driver:</span>
              <span className="driver-phone-popover-phone">{displayPhone}</span>
            </div>

            {safePhone && safePhone !== "—" && (
              <button
                type="button"
                className={`driver-phone-popover-copy-btn ${copied ? "copied" : ""}`}
                onClick={handleCopy}
                title="Copy phone number"
                aria-label={copied ? "Copied" : "Copy phone number"}
              >
                {copied ? (
                  <>
                    <Check size={11} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="driver-phone-popover-help">
            Call or message the driver if you need dispatch coordination.
          </p>

          {companyName && (
            <div className="driver-phone-popover-meta">
              <span>
                Company: <strong className="driver-phone-popover-meta-val">{companyName}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DriverPhoneModal;

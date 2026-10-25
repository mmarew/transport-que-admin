import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Phone, Copy, Check, X } from "lucide-react";
import "./DriverPhonePopover.css";

export interface DriverPhonePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  phone?: string | null;
  driverName?: string | null;
  companyName?: string | null;
  driverId?: string | null;
  plateNumber?: string | null;
}

export const DriverPhonePopover: React.FC<DriverPhonePopoverProps> = ({
  isOpen,
  onClose,
  triggerRef,
  phone,
  companyName,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "placement-top" | "placement-bottom";
    arrowLeft: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 300;
    const estimatedHeight = 120;
    const margin = 8;

    // Check space below vs above
    const spaceBelow = window.innerHeight - rect.bottom;
    const isAbove =
      spaceBelow < estimatedHeight + margin &&
      rect.top > estimatedHeight + margin;

    const placement: "placement-top" | "placement-bottom" = isAbove
      ? "placement-top"
      : "placement-bottom";

    const top = isAbove
      ? Math.max(10, rect.top - estimatedHeight - margin)
      : Math.min(window.innerHeight - estimatedHeight - 10, rect.bottom + margin);

    // Center horizontally on trigger button, clamp within viewport
    const triggerCenter = rect.left + rect.width / 2;
    let left = triggerCenter - popoverWidth / 2;
    const minLeft = 12;
    const maxLeft = Math.max(minLeft, window.innerWidth - popoverWidth - 12);

    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    const arrowLeft = Math.max(
      14,
      Math.min(popoverWidth - 14, triggerCenter - left),
    );

    setCoords({ top, left, placement, arrowLeft });
  }, [triggerRef]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        if (triggerRef.current && "focus" in triggerRef.current) {
          (triggerRef.current as HTMLElement).focus();
        }
      }
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, [isOpen, updatePosition, onClose, triggerRef]);

  if (!isOpen || !coords) return null;

  const safePhone = phone || "";
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
      ref={popoverRef}
      className="driver-phone-popover"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="false"
      aria-label="Driver Contact"
    >
      {/* Arrow pointing to trigger button */}
      <div
        className={`driver-phone-popover-arrow ${coords.placement}`}
        style={{ left: `${coords.arrowLeft}px` }}
      />

      {/* Header */}
      <div className="driver-phone-popover-header">
        <div className="driver-phone-popover-title-row">
          <div className="driver-phone-popover-badge">
            <Phone size={12} strokeWidth={2.5} />
          </div>
          <span className="driver-phone-popover-title">Driver Contact</span>
        </div>
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

      {/* Driver Contact Card (matches pending approval card in design) */}
      <div className="driver-phone-popover-card">
        <div className="driver-phone-popover-driver-row">
          <div className="driver-phone-popover-driver-info">
            <Phone size={13} style={{ color: "#0B4D6D", flexShrink: 0 }} />
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
    </div>,
    document.body
  );
};

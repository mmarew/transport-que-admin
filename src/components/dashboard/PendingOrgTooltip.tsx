import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Info, Phone, Clock, X } from "lucide-react";
import "./PendingOrgTooltip.css";

export interface PendingOrgTooltipProps {
  /** Admin contact phone number to display */
  adminPhone?: string;
  /** Name of the organization / company */
  orgName?: string;
  /** Optional extra CSS class */
  className?: string;
}

const DEFAULT_ADMIN_PHONE = "0983222221";

export function PendingOrgTooltip({
  adminPhone = DEFAULT_ADMIN_PHONE,
  orgName,
  className = "",
}: PendingOrgTooltipProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "placement-top" | "placement-bottom";
    arrowLeft: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    const estimatedHeight = 135;
    const margin = 8;

    // Determine vertical placement
    const spaceBelow = window.innerHeight - rect.bottom;
    const isAbove =
      spaceBelow < estimatedHeight + margin &&
      rect.top > estimatedHeight + margin;

    const placement = isAbove ? "placement-top" : "placement-bottom";
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
  }, []);

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
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
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
    };
  }, [isOpen, updatePosition]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handlePopoverMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handlePopoverMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updatePosition();
      setIsOpen(true);
    }
  };

  const stageNotice = orgName
    ? t("dashboard.pendingOrgNamedNotice", {
        name: orgName,
        defaultValue: `"${orgName}" is currently in the pending stage.`,
      })
    : t(
        "dashboard.pendingStageNotice",
        "This company is currently in the pending stage.",
      );

  const adminHelp = t(
    "dashboard.pendingCallAdminHelp",
    "Call the admin if you need more help.",
  );

  const fullSummary = `${stageNotice} ${t("dashboard.pendingAdminContact", { phone: adminPhone, defaultValue: `Admin: ${adminPhone}` })}. ${adminHelp}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`org-pending-info-btn ${isOpen ? "active" : ""} ${className}`}
        aria-label={fullSummary}
        title={fullSummary}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Info size={12} strokeWidth={2.4} />
      </button>

      {isOpen &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            className="org-pending-popover"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="false"
            aria-label={t("dashboard.pendingStageTitle", "Pending Approval")}
          >
            <div
              className={`org-pending-popover-arrow ${coords.placement}`}
              style={{ left: `${coords.arrowLeft}px` }}
            />

            <div className="org-pending-popover-header">
              <div className="org-pending-popover-title-row">
                <div className="org-pending-popover-badge">
                  <Clock size={12} strokeWidth={2.5} />
                </div>
                <span className="org-pending-popover-title">
                  {t("dashboard.pendingStageTitle", "Pending Approval")}
                </span>
              </div>
              <button
                type="button"
                className="org-pending-popover-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={13} />
              </button>
            </div>

            <p className="org-pending-popover-body">{stageNotice}</p>

            <div className="org-pending-popover-card">
              <div className="org-pending-popover-admin">
                <Phone size={13} style={{ color: "#ea580c", flexShrink: 0 }} />
                <span>
                  <strong>{t("dashboard.adminLabel", "Admin")}:</strong>{" "}
                  <a
                    href={`tel:${adminPhone}`}
                    className="org-pending-popover-phone"
                  >
                    {adminPhone}
                  </a>
                </span>
              </div>
              <p className="org-pending-popover-help">{adminHelp}</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default PendingOrgTooltip;

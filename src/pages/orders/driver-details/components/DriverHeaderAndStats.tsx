import React, { useState, useRef, useEffect } from "react";
import {
  Phone,
  Truck,
  Info,
  Route as RouteIcon,
  Clock,
  Navigation,
  CreditCard,
  Copy,
  Check,
  X,
} from "lucide-react";
import type { DriverDetailsModel } from "../driverDetailsMapper";

interface DriverHeaderAndStatsProps {
  model: DriverDetailsModel;
}

export const DriverHeaderAndStats: React.FC<DriverHeaderAndStatsProps> = ({
  model,
}) => {
  const [isPhonePopupOpen, setIsPhonePopupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopyPhone = () => {
    if (!model.driverPhone) return;
    navigator.clipboard.writeText(model.driverPhone).then(
      () => {
        setCopied(true);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      },
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    );
  };

  useEffect(() => {
    if (!isPhonePopupOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (popupRef.current && !popupRef.current.contains(target)) {
        setIsPhonePopupOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPhonePopupOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, [isPhonePopupOpen]);

  return (
    <div className="driver-header-stats-section">
      {/* ── Driver Profile Card ── */}
      <div className="driver-profile-card">
        <div className="driver-profile-top">
          <div className="driver-profile-left">
            {/* Avatar Initials Circle */}
            <div className="driver-profile-avatar" title={model.driverName}>
              {model.driverInitials}
            </div>

            {/* Name, Status, Phone, Driver ID */}
            <div className="driver-profile-meta">
              <div className="driver-profile-name-row">
                <h2 className="driver-profile-name">{model.driverName}</h2>
                <div
                  className={`driver-badge-pill driver-badge-pill--${model.driverStatus.type}`}
                >
                  <span
                    className="driver-badge-dot"
                    style={{ backgroundColor: model.driverStatus.dotColor }}
                  />
                  <span>{model.driverStatus.label}</span>
                </div>
              </div>
              <div className="driver-profile-id-row">
                <span className="driver-profile-phone">{model.driverPhone}</span>
                {model.companyName ? (
                  <>
                    <span className="driver-profile-separator">·</span>
                    <span className="driver-profile-company" style={{ fontWeight: 600, color: "var(--color-primary, #0B4D6D)" }}>
                      Company · {model.companyName}
                    </span>
                  </>
                ) : null}
                {model.driverId ? (
                  <>
                    <span className="driver-profile-separator">·</span>
                    <span className="driver-profile-id">Driver ID · {model.driverId}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="driver-profile-actions" ref={popupRef}>
            {model.driverPhone && model.driverPhone !== "—" ? (
              <button
                type="button"
                className={`driver-btn-call ${isPhonePopupOpen ? "active" : ""}`}
                onClick={() => setIsPhonePopupOpen((prev) => !prev)}
                aria-expanded={isPhonePopupOpen}
                aria-haspopup="dialog"
                title={`View phone number for ${model.driverName}`}
              >
                <Phone size={16} fill="currentColor" />
                <span>Call driver</span>
              </button>
            ) : (
              <button
                type="button"
                className="driver-btn-call driver-btn-call--disabled"
                disabled
                title="Phone number not available"
              >
                <Phone size={16} fill="currentColor" />
                <span>Call driver</span>
              </button>
            )}

            {isPhonePopupOpen && model.driverPhone && (
              <div
                className="driver-phone-popup"
                role="dialog"
                aria-modal="false"
                aria-label="Driver Contact Information"
              >
                <div className="driver-phone-popup-header">
                  <div className="driver-phone-popup-badge">
                    <Phone size={14} />
                  </div>
                  <div className="driver-phone-popup-title-wrap">
                    <h4 className="driver-phone-popup-title">Driver Phone</h4>
                    <span className="driver-phone-popup-name">{model.driverName}</span>
                  </div>
                  <button
                    type="button"
                    className="driver-phone-popup-close"
                    onClick={() => setIsPhonePopupOpen(false)}
                    aria-label="Close"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="driver-phone-popup-card">
                  <div className="driver-phone-display">
                    <span className="driver-phone-number">{model.driverPhone}</span>
                  </div>
                  <button
                    type="button"
                    className="driver-phone-copy-btn"
                    onClick={handleCopyPhone}
                    title="Copy phone number"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {(model.companyName || model.driverId) && (
                  <div className="driver-phone-popup-meta">
                    {model.companyName && (
                      <div className="driver-phone-meta-item">
                        <span className="driver-phone-meta-label">Company:</span>
                        <span className="driver-phone-meta-val">{model.companyName}</span>
                      </div>
                    )}
                    {model.driverId && (
                      <div className="driver-phone-meta-item">
                        <span className="driver-phone-meta-label">Driver ID:</span>
                        <span className="driver-phone-meta-val">{model.driverId}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Strip at bottom of Profile Card */}
        <div className="driver-profile-info-strip">
          <div className="driver-profile-route-info">
            <Truck size={16} className="driver-profile-truck-icon" />
            <span className="driver-profile-route-text">
              {model.route.origin} → {model.route.destination}
            </span>
            <span className="driver-profile-separator">·</span>
            <span className="driver-profile-type-text">
              {model.orderType} order · {model.commodity}
            </span>
          </div>

          <div className="driver-profile-notice">
            <Info size={14} className="driver-profile-info-icon" />
            <span>Illustrative post-dispatch view · Not live GPS</span>
          </div>
        </div>
      </div>

      {/* ── 4 KPI Metric Cards Grid ── */}
      <div className="driver-metrics-grid">
        {/* 1. TRIP PROGRESS */}
        <div className="driver-metric-card">
          <div className="driver-metric-head">
            <span className="driver-metric-label">TRIP PROGRESS</span>
            <RouteIcon size={18} className="driver-metric-icon" />
          </div>
          <div className="driver-metric-value">{model.progressPercentage}%</div>
          <div className="driver-metric-sub">
            {model.completedDistanceKm} of {model.totalDistanceKm} km completed
          </div>
        </div>

        {/* 2. DURATION */}
        <div className="driver-metric-card">
          <div className="driver-metric-head">
            <span className="driver-metric-label">DURATION</span>
            <Clock size={18} className="driver-metric-icon" />
          </div>
          <div className="driver-metric-value">{model.durationMinutes} min</div>
          <div className="driver-metric-sub">
            {model.remainingMinutes} min remaining ·{" "}
            {model.durationMinutes + model.remainingMinutes} min total
          </div>
        </div>

        {/* 3. DISTANCE */}
        <div className="driver-metric-card">
          <div className="driver-metric-head">
            <span className="driver-metric-label">DISTANCE</span>
            <Navigation size={18} className="driver-metric-icon" />
          </div>
          <div className="driver-metric-value">{model.totalDistanceKm} km</div>
          <div className="driver-metric-sub">
            {model.remainingDistanceKm} km to destination
          </div>
        </div>

        {/* 4. ORDER COST */}
        <div className="driver-metric-card">
          <div className="driver-metric-head">
            <span className="driver-metric-label">ORDER COST</span>
            <CreditCard size={18} className="driver-metric-icon" />
          </div>
          <div className="driver-metric-value">
            {model.totalVehicles > 1 ? model.singleCostDisplay : model.costDisplay}
          </div>
          <div className="driver-metric-sub">
            {model.orderType === "Group" && model.totalVehicles > 1
              ? `Per truck · ${model.costDisplay} total (${model.totalVehicles} trucks)`
              : "Single vehicle order"}
          </div>
        </div>
      </div>
    </div>
  );
};

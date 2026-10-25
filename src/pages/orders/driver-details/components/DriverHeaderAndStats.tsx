import React, { useState, useRef } from "react";
import {
  Phone,
  Truck,
  Info,
  Route as RouteIcon,
  Clock,
  Navigation,
  CreditCard,
} from "lucide-react";
import type { DriverDetailsModel } from "../driverDetailsMapper";
import { DriverPhonePopover } from "./DriverPhonePopover";

interface DriverHeaderAndStatsProps {
  model: DriverDetailsModel;
}

export const DriverHeaderAndStats: React.FC<DriverHeaderAndStatsProps> = ({
  model,
}) => {
  const [isPhonePopoverOpen, setIsPhonePopoverOpen] = useState(false);
  const callButtonRef = useRef<HTMLButtonElement>(null);

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
                {model.driverPhone && model.driverPhone !== "—" ? (
                  <button
                    type="button"
                    className="driver-profile-phone driver-profile-phone-btn"
                    onClick={() => setIsPhonePopoverOpen(true)}
                    title="Click to view driver phone contact"
                  >
                    {model.driverPhone}
                  </button>
                ) : (
                  <span className="driver-profile-phone">{model.driverPhone}</span>
                )}
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
          <div className="driver-profile-actions">
            {model.driverPhone && model.driverPhone !== "—" ? (
              <button
                ref={callButtonRef}
                type="button"
                className={`driver-btn-call ${isPhonePopoverOpen ? "active" : ""}`}
                onClick={() => setIsPhonePopoverOpen((prev) => !prev)}
                aria-expanded={isPhonePopoverOpen}
                aria-haspopup="dialog"
                title={`View phone contact for ${model.driverName}`}
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

            {/* Balloon Popover pointing to Call driver button (matches Pending Approval tooltip) */}
            <DriverPhonePopover
              isOpen={isPhonePopoverOpen}
              onClose={() => setIsPhonePopoverOpen(false)}
              triggerRef={callButtonRef}
              phone={model.driverPhone}
              driverName={model.driverName}
              companyName={model.companyName}
              driverId={model.driverId}
              plateNumber={model.vehicle?.plateNumber}
            />
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

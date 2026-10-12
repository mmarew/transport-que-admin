import React from "react";
import type { DriverDetailsModel } from "../driverDetailsMapper";

interface DriverActivityAndCostCardsProps {
  model: DriverDetailsModel;
}

export const DriverActivityAndCostCards: React.FC<DriverActivityAndCostCardsProps> = ({ model }) => {
  return (
    <div className="driver-activity-cost-row">
      {/* ── Left Card: Trip Activity ── */}
      <div className="driver-activity-card">
        <div className="driver-activity-card-header">
          <h3 className="driver-activity-card-title">Trip activity</h3>
          <span className="driver-activity-card-date">
            {model.currentTimeString.split(",")[0]} · EAT
          </span>
        </div>

        <div className="driver-timeline-list">
          {model.timeline.map((item, idx) => {
            const isLast = idx === model.timeline.length - 1;
            return (
              <div key={idx} className={`driver-timeline-item driver-timeline-item--${item.status}`}>
                {/* Time on left */}
                <div className="driver-timeline-time">{item.time}</div>

                {/* Node & vertical line indicator */}
                <div className="driver-timeline-indicator">
                  <span
                    className={`driver-timeline-dot driver-timeline-dot--${item.status}`}
                  />
                  {!isLast && <span className="driver-timeline-line" />}
                </div>

                {/* Content */}
                <div className="driver-timeline-content">
                  <div className="driver-timeline-title">{item.title}</div>
                  <div className="driver-timeline-desc">{item.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Card: Cost & Dispatch ── */}
      <div className="driver-cost-card">
        <div className="driver-cost-card-header">
          <h3 className="driver-cost-card-title">Cost & dispatch</h3>
          <p className="driver-cost-card-sub">
            Order #{model.orderNumber} · Quoted total for {model.totalVehicles}{" "}
            {model.totalVehicles === 1 ? "truck" : "trucks"}
          </p>
        </div>

        <div className="driver-cost-breakdown">
          <div className="driver-cost-row">
            <span className="driver-cost-label">Transport</span>
            <span className="driver-cost-val">
              {model.transportCost.toLocaleString()} ETB
            </span>
          </div>
          <div className="driver-cost-row">
            <span className="driver-cost-label">Handling</span>
            <span className="driver-cost-val">
              {model.handlingCost.toLocaleString()} ETB
            </span>
          </div>

          <div className="driver-cost-divider" />

          <div className="driver-cost-total-row">
            <span className="driver-cost-total-label">Total cost</span>
            <span className="driver-cost-total-val">
              {model.totalCost.toLocaleString()} ETB
            </span>
          </div>
        </div>

        <div className="driver-cost-badge-wrap">
          <div
            className={`driver-badge-pill ${
              model.dispatch.paymentStatus === "Paid"
                ? "driver-badge-pill--green"
                : model.dispatch.paymentStatus === "Processing"
                ? "driver-badge-pill--heading-to-load"
                : "driver-badge-pill--gray"
            }`}
          >
            <span
              className={`driver-badge-dot ${
                model.dispatch.paymentStatus === "Paid"
                  ? "driver-badge-dot--green"
                  : model.dispatch.paymentStatus === "Processing"
                  ? "driver-badge-dot--amber"
                  : "driver-badge-dot--gray"
              }`}
            />
            <span>{model.dispatch.paymentStatus}</span>
          </div>
        </div>

        <div className="driver-dispatch-contact-section">
          <span className="driver-dispatch-contact-label">Dispatch contact</span>
          <a
            href={`tel:${model.dispatch.contactPhone}`}
            className="driver-dispatch-contact-phone"
          >
            {model.dispatch.contactPhone}
          </a>
          <span className="driver-dispatch-contact-name">
            {model.dispatch.orgName} — {model.dispatch.orgCity}
          </span>
        </div>
      </div>
    </div>
  );
};

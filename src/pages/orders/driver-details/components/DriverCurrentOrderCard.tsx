import React from "react";
import type { DriverDetailsModel } from "../driverDetailsMapper";

interface DriverCurrentOrderCardProps {
  model: DriverDetailsModel;
}

export const DriverCurrentOrderCard: React.FC<DriverCurrentOrderCardProps> = ({ model }) => {
  return (
    <div className="driver-current-order-card">
      {/* Top Header */}
      <div className="driver-current-order-header">
        <h3 className="driver-current-order-title">Current order</h3>
        <span className="driver-current-order-id">#{model.orderNumber}</span>
      </div>

      {/* Main Route Title */}
      <h2 className="driver-current-order-route">
        {model.route.origin} → {model.route.destination}
      </h2>

      {/* Pickup Section */}
      <div className="driver-order-section">
        <span className="driver-order-section-tag">PICKUP</span>
        <div className="driver-order-section-main">{model.route.originYard}</div>
        <div className="driver-order-section-sub">
          Departed at {model.departedTime}
        </div>
      </div>

      {/* Delivery Section */}
      <div className="driver-order-section">
        <span className="driver-order-section-tag">DELIVERY</span>
        <div className="driver-order-section-main">{model.route.destinationDepot}</div>
        <div className="driver-order-section-sub">
          Expected arrival at {model.estimatedArrival}
        </div>
      </div>

      {/* Commodity & Assignment Grid */}
      <div className="driver-order-grid-2col">
        <div className="driver-order-grid-item">
          <span className="driver-order-grid-label">Commodity</span>
          <span className="driver-order-grid-val">{model.commodity}</span>
        </div>
        <div className="driver-order-grid-item">
          <span className="driver-order-grid-label">Assignment</span>
          <span className="driver-order-grid-val">
            {model.orderType} · {model.totalVehicles} trucks
          </span>
        </div>
      </div>

      {/* Declared shipment weight */}
      <div className="driver-order-weight-section">
        <span className="driver-order-grid-label">Declared shipment weight</span>
        <div className="driver-order-weight-val">{model.weightDisplay}</div>
        <div className="driver-order-section-sub">
          {model.orderType === "Group"
            ? "Order total across the group"
            : "Single vehicle shipment"}
        </div>
      </div>

      {/* Trip Progress Bar */}
      <div className="driver-order-progress-section">
        <div className="driver-order-progress-head">
          <span className="driver-order-progress-label">Trip progress</span>
          <span className="driver-order-progress-pct">{model.progressPercentage}%</span>
        </div>
        <div className="driver-order-progress-track">
          <div
            className="driver-order-progress-fill"
            style={{ width: `${model.progressPercentage}%` }}
          />
        </div>
        <div className="driver-order-progress-sub">
          {model.driverStatus.label} ·{" "}
          {model.progressPercentage >= 100
            ? "Delivery confirmed"
            : "Delivery confirmation pending"}
        </div>
      </div>
    </div>
  );
};

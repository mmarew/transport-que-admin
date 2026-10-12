import React from "react";
import { Truck, BadgeCheck } from "lucide-react";
import type { DriverDetailsModel } from "../driverDetailsMapper";

interface DriverVehicleLicenceCardsProps {
  model: DriverDetailsModel;
}

export const DriverVehicleLicenceCards: React.FC<DriverVehicleLicenceCardsProps> = ({ model }) => {
  const isVehicleActive = model.vehicle.status === "Active";
  const isVehicleMaintenance = model.vehicle.status === "Maintenance";
  const isVehiclePending = !model.isDriverAssigned || model.vehicle.status === "Pending" || model.vehicle.status === "Inactive";

  return (
    <div className="driver-specs-row">
      {/* ── 1. Vehicle Details Card ── */}
      <div className="driver-specs-card">
        <div className="driver-specs-card-header">
          <div className="driver-specs-card-title-wrap">
            <Truck size={18} className="driver-specs-card-icon" />
            <h3 className="driver-specs-card-title">Vehicle details</h3>
          </div>
          {isVehicleActive ? (
            <div className="driver-badge-pill driver-badge-pill--green">
              <span className="driver-badge-dot driver-badge-dot--green" />
              <span>Active</span>
            </div>
          ) : isVehicleMaintenance ? (
            <div className="driver-badge-pill driver-badge-pill--heading-to-load">
              <span className="driver-badge-dot driver-badge-dot--amber" />
              <span>Maintenance</span>
            </div>
          ) : isVehiclePending ? (
            <div className="driver-badge-pill driver-badge-pill--gray">
              <span className="driver-badge-dot driver-badge-dot--gray" />
              <span>Pending</span>
            </div>
          ) : (
            <div className="driver-badge-pill driver-badge-pill--accepted">
              <span className="driver-badge-dot driver-badge-dot--green" />
              <span>{model.vehicle.status}</span>
            </div>
          )}
        </div>

        <div className="driver-specs-grid">
          {/* Row 1 */}
          <div className="driver-spec-field">
            <span className="driver-spec-label">Vehicle type</span>
            <span className="driver-spec-val">{model.vehicle.type}</span>
          </div>
          <div className="driver-spec-field">
            <span className="driver-spec-label">Make / model</span>
            <span className="driver-spec-val">{model.vehicle.makeModel}</span>
          </div>

          {/* Row 2 */}
          <div className="driver-spec-field">
            <span className="driver-spec-label">Plate number</span>
            <span className="driver-spec-val">{model.vehicle.plateNumber}</span>
          </div>
          <div className="driver-spec-field">
            <span className="driver-spec-label">Fleet vehicle ID</span>
            <span className="driver-spec-val">{model.vehicle.fleetId}</span>
          </div>

          <div className="driver-specs-divider" />

          {/* Row 3 */}
          <div className="driver-spec-field">
            <span className="driver-spec-label">Insurance valid until</span>
            <span className="driver-spec-val">{model.vehicle.insuranceExpiry}</span>
          </div>
          <div className="driver-spec-field">
            <span className="driver-spec-label">Last inspection</span>
            <span className="driver-spec-val">{model.vehicle.lastInspection}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Driving Licence Card ── */}
      <div className="driver-specs-card">
        <div className="driver-specs-card-header">
          <div className="driver-specs-card-title-wrap">
            <BadgeCheck size={18} className="driver-specs-card-icon" />
            <h3 className="driver-specs-card-title">Driving licence</h3>
          </div>
          {model.isDriverAssigned ? (
            <div className="driver-badge-pill driver-badge-pill--green">
              <span className="driver-badge-dot driver-badge-dot--green" />
              <span>Verified</span>
            </div>
          ) : (
            <div className="driver-badge-pill driver-badge-pill--gray">
              <span className="driver-badge-dot driver-badge-dot--gray" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        <div className="driver-specs-grid">
          {/* Row 1 */}
          <div className="driver-spec-field">
            <span className="driver-spec-label">Licence number</span>
            <span className="driver-spec-val">{model.licence.number}</span>
          </div>
          <div className="driver-spec-field">
            <span className="driver-spec-label">Licence class</span>
            <span className="driver-spec-val">{model.licence.licenceClass}</span>
          </div>

          {/* Row 2 */}
          <div className="driver-spec-field">
            <span className="driver-spec-label">Issued by</span>
            <span className="driver-spec-val">{model.licence.issuedBy}</span>
          </div>
          <div className="driver-spec-field">
            <span className="driver-spec-label">Valid until</span>
            <span className="driver-spec-val">{model.licence.validUntil}</span>
          </div>

          <div className="driver-specs-divider" />

          {/* Row 3 */}
          <div className="driver-spec-field">
            <span className="driver-spec-label">Driving experience</span>
            <span className="driver-spec-val">{model.licence.experienceYears}</span>
          </div>
          <div className="driver-spec-field">
            <span className="driver-spec-label">Emergency contact</span>
            {model.licence.emergencyContact &&
            model.licence.emergencyContact !== "—" &&
            model.licence.emergencyContact !== "Not recorded" ? (
              <a
                href={`tel:${model.licence.emergencyContact}`}
                className="driver-spec-val driver-spec-val--link"
              >
                {model.licence.emergencyContact}
              </a>
            ) : (
              <span className="driver-spec-val">{model.licence.emergencyContact || "—"}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

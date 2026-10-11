import React, { useState } from "react";
import { X, Save, User, Phone, ShieldCheck, Truck, BadgeCheck, Calendar } from "lucide-react";
import { toast } from "sonner";
import type { DriverDetailsModel } from "../driverDetailsMapper";

interface EditDriverModalProps {
  model: DriverDetailsModel;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<DriverDetailsModel>) => void;
}

export const EditDriverModal: React.FC<EditDriverModalProps> = ({
  model,
  isOpen,
  onClose,
  onSave,
}) => {
  const [driverName, setDriverName] = useState(model.driverName);
  const [driverPhone, setDriverPhone] = useState(model.driverPhone);
  const [plateNumber, setPlateNumber] = useState(
    model.vehicle.plateNumber === "Not recorded" || model.vehicle.plateNumber === "Pending assignment"
      ? ""
      : model.vehicle.plateNumber
  );
  const [makeModel, setMakeModel] = useState(
    model.vehicle.makeModel === "Not specified" || model.vehicle.makeModel === "Commercial Standard"
      ? ""
      : model.vehicle.makeModel
  );
  const [insuranceExpiry, setInsuranceExpiry] = useState(
    model.vehicle.insuranceExpiry === "Not recorded" || model.vehicle.insuranceExpiry === "—"
      ? ""
      : model.vehicle.insuranceExpiry
  );
  const [lastInspection, setLastInspection] = useState(
    model.vehicle.lastInspection === "Not recorded" || model.vehicle.lastInspection === "—"
      ? ""
      : model.vehicle.lastInspection
  );
  const [licenceNumber, setLicenceNumber] = useState(
    model.licence.number === "Not recorded" || model.licence.number === "Pending assignment"
      ? ""
      : model.licence.number
  );
  const [licenceClass, setLicenceClass] = useState(
    model.licence.licenceClass === "—" ? "" : model.licence.licenceClass
  );
  const [emergencyContact, setEmergencyContact] = useState(
    model.licence.emergencyContact === "—" ? "" : model.licence.emergencyContact
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      driverName: driverName.trim() || model.driverName,
      driverPhone: driverPhone.trim() || model.driverPhone,
      vehicle: {
        ...model.vehicle,
        plateNumber: plateNumber.trim() || "Not recorded",
        makeModel: makeModel.trim() || model.vehicle.makeModel,
        insuranceExpiry: insuranceExpiry.trim() || "Not recorded",
        lastInspection: lastInspection.trim() || "Not recorded",
      },
      licence: {
        ...model.licence,
        number: licenceNumber.trim() || "Not recorded",
        licenceClass: licenceClass.trim() || model.licence.licenceClass,
        emergencyContact: emergencyContact.trim() || "—",
        isVerified: Boolean(licenceNumber.trim()),
      },
    });
    toast.success("Driver and vehicle details updated successfully");
    onClose();
  };

  return (
    <div className="driver-modal-overlay" onClick={onClose}>
      <div
        className="driver-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: "560px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="driver-modal-header">
          <div className="driver-modal-title-wrap">
            <User size={20} className="driver-modal-icon" />
            <h3 className="driver-modal-title">Edit Driver & Vehicle Specs</h3>
          </div>
          <button
            type="button"
            className="driver-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="driver-modal-form"
          style={{ overflowY: "auto", flex: 1 }}
        >
          {/* Driver Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="driver-modal-field">
              <label className="driver-modal-label">Driver Full Name</label>
              <div className="driver-modal-input-wrap">
                <User size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Kebede Michael"
                  required
                />
              </div>
            </div>

            <div className="driver-modal-field">
              <label className="driver-modal-label">Phone Number</label>
              <div className="driver-modal-input-wrap">
                <Phone size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+251 9..."
                  required
                />
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="driver-modal-field">
              <label className="driver-modal-label">Plate Number</label>
              <div className="driver-modal-input-wrap">
                <Truck size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="e.g. ET-3-12345"
                />
              </div>
            </div>

            <div className="driver-modal-field">
              <label className="driver-modal-label">Make / Model</label>
              <div className="driver-modal-input-wrap">
                <Truck size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={makeModel}
                  onChange={(e) => setMakeModel(e.target.value)}
                  placeholder="e.g. Sinotruk HOWO · 2021"
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="driver-modal-field">
              <label className="driver-modal-label">Insurance Valid Until</label>
              <div className="driver-modal-input-wrap">
                <Calendar size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  placeholder="e.g. 31 Dec 2026"
                />
              </div>
            </div>

            <div className="driver-modal-field">
              <label className="driver-modal-label">Last Inspection</label>
              <div className="driver-modal-input-wrap">
                <ShieldCheck size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={lastInspection}
                  onChange={(e) => setLastInspection(e.target.value)}
                  placeholder="e.g. 28 Sep 2026 · Passed"
                />
              </div>
            </div>
          </div>

          {/* License Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="driver-modal-field">
              <label className="driver-modal-label">Licence Number</label>
              <div className="driver-modal-input-wrap">
                <BadgeCheck size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  placeholder="e.g. DL-ET-102938"
                />
              </div>
            </div>

            <div className="driver-modal-field">
              <label className="driver-modal-label">Licence Class</label>
              <div className="driver-modal-input-wrap">
                <BadgeCheck size={16} className="driver-modal-input-icon" />
                <input
                  type="text"
                  className="driver-modal-input"
                  value={licenceClass}
                  onChange={(e) => setLicenceClass(e.target.value)}
                  placeholder="e.g. Commercial Heavy Goods"
                />
              </div>
            </div>
          </div>

          <div className="driver-modal-field">
            <label className="driver-modal-label">Emergency Contact Phone</label>
            <div className="driver-modal-input-wrap">
              <Phone size={16} className="driver-modal-input-icon" />
              <input
                type="text"
                className="driver-modal-input"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+251 9..."
              />
            </div>
          </div>

          <div className="driver-modal-actions" style={{ marginTop: "0.5rem" }}>
            <button
              type="button"
              className="driver-modal-btn driver-modal-btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="driver-modal-btn driver-modal-btn--save"
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

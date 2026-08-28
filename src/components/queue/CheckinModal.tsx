import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, Search, User } from "lucide-react";
import {
  useManualCheckinMutation,
  useListVehicleDriversQuery,
  useGetQueueStatusQuery,
  useListVehicleTypesQuery,
} from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { checkinSchema, type CheckinFormValues } from "../../schemas/queue";
import { resolveVehicleName } from "../../utils/vehicleType";
import { useModalA11y } from "../../hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";
import "./QueueModals.css";

interface CheckinModalProps {
  queueOrganizationUniqueId: string;
  onCheckedIn?: () => void;
  onClose: () => void;
}

export function CheckinModal({ queueOrganizationUniqueId, onCheckedIn, onClose }: CheckinModalProps) {
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema),
  });

  const selectedVehicleDriverUniqueId = watch("vehicleDriverUniqueId");
  const inputQueueNumber = watch("queueNumber");

  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [checkinMutation, { isLoading: isCheckingIn }] = useManualCheckinMutation();
  const { data: driversData } = useListVehicleDriversQuery();

  const { data: queueStatusData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId },
    { skip: !queueOrganizationUniqueId }
  );

  const driversList = useMemo(
    () => (Array.isArray(driversData?.data) ? driversData.data : []),
    [driversData]
  );

  // Filter registered drivers based on search input
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return driversList;
    const q = searchQuery.toLowerCase().trim();
    return driversList.filter(
      (d) =>
        d.driverName?.toLowerCase().includes(q) ||
        d.driverPhoneNumber?.includes(q) ||
        d.vehicleDriverUniqueId?.toLowerCase().includes(q) ||
        d.vehicleTypeName?.toLowerCase().includes(q)
    );
  }, [driversList, searchQuery]);

  // Find currently selected driver
  const selectedDriver = useMemo(() => {
    if (!selectedVehicleDriverUniqueId) {
      return driversList[0] || null;
    }
    return driversList.find((d) => d.vehicleDriverUniqueId === selectedVehicleDriverUniqueId) || null;
  }, [selectedVehicleDriverUniqueId, driversList]);

  // Set initial driver if available
  useEffect(() => {
    if (driversList.length > 0 && !selectedVehicleDriverUniqueId) {
      setValue("vehicleDriverUniqueId", driversList[0].vehicleDriverUniqueId, { shouldValidate: true });
    }
  }, [driversList, selectedVehicleDriverUniqueId, setValue]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate estimated next queue position
  const estimatedPosition = useMemo(() => {
    if (inputQueueNumber && Number(inputQueueNumber) > 0) {
      return Number(inputQueueNumber);
    }
    if (queueStatusData?.data?.queues) {
      const allQueues = Object.values(queueStatusData.data.queues);
      const totalWaiting = allQueues.flat().length;
      return totalWaiting + 1;
    }
    return 1;
  }, [inputQueueNumber, queueStatusData]);

  const { data: vtData } = useListVehicleTypesQuery();
  const vtList = vtData?.data || [];
  const targetVehicleTypeName = resolveVehicleName(
    selectedDriver?.vehicleTypeUniqueId,
    selectedDriver?.vehicleTypeName,
    vtList
  );

  const handleFormSubmit = async (values: CheckinFormValues) => {
    try {
      const res = await checkinMutation({
        queueOrganizationUniqueId,
        vehicleDriverUniqueId: values.vehicleDriverUniqueId,
        queueNumber: values.queueNumber,
      }).unwrap();

      toast.success(res?.message || `Driver checked in at #${res?.data?.queueNumber ?? 1}`);
      onCheckedIn?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  return createPortal(
    <div className="qm-overlay">
      <div
        className="qm-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-modal-title"
      >
        {/* Mobile Header */}
        <div className="qm-mobile-header">
          <MobileHeader title="Manual Check-in" onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="qm-header qm-header--desktop">
          <div>
            <h2 id="checkin-modal-title" className="qm-title">Manual Check-in</h2>
            <p className="qm-subtitle">
              Register a driver into the queue manually when they arrive at the terminal.
            </p>
          </div>
          <button type="button" className="qm-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Section 1: Vehicle-Driver ID */}
          <div style={{ marginTop: "6px" }}>
            <h3 className="qm-section-title">1. Vehicle-Driver ID</h3>
            <div className="qm-field-group">
              <label className="qm-field-label">Search or enter vehicle-driver ID</label>
              <div className="qm-input-wrap" ref={searchWrapRef}>
                <Search size={16} className="qm-input-icon" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    setDropdownOpen(true);
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())) {
                      setValue("vehicleDriverUniqueId", val.trim(), { shouldValidate: true });
                    }
                  }}
                  placeholder={
                    selectedDriver
                      ? `${selectedDriver.driverName} (${selectedDriver.vehicleDriverUniqueId.slice(0, 7)})`
                      : "Search by driver name, phone, or ID..."
                  }
                  className="qm-input has-icon"
                />

                {dropdownOpen && (
                  <div className="dm-dropdown-menu" style={{ maxHeight: "160px" }}>
                    {filteredDrivers.length > 0 ? (
                      filteredDrivers.map((d) => (
                        <div
                          key={d.vehicleDriverUniqueId}
                          className={`dm-dropdown-item ${selectedVehicleDriverUniqueId === d.vehicleDriverUniqueId ? "selected" : ""}`}
                          onClick={() => {
                            setValue("vehicleDriverUniqueId", d.vehicleDriverUniqueId, { shouldValidate: true });
                            setSearchQuery(`${d.driverName} (${d.driverPhoneNumber})`);
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="dm-dropdown-item-text">
                            <strong>{d.driverName}</strong> — {d.driverPhoneNumber}
                          </span>
                          <span className="dm-dropdown-item-badge">
                            {d.vehicleTypeName || "Vehicle"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "10px 14px", fontSize: "0.8rem", color: "#64748b" }}>
                        No matching drivers found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.vehicleDriverUniqueId && (
                <p className="qm-error-text">{errors.vehicleDriverUniqueId.message}</p>
              )}
            </div>

            {/* Selected Driver Preview Card */}
            {selectedDriver && (
              <div className="qm-card" style={{ marginTop: "6px" }}>
                <div className="qm-icon-circle">
                  <User size={20} />
                </div>
                <div className="qm-card-info">
                  <span className="qm-card-title">{selectedDriver.driverName || "Selected Driver"}</span>
                  <span className="qm-card-sub">{selectedDriver.driverPhoneNumber || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Queue Position */}
          <div style={{ marginTop: "14px" }}>
            <h3 className="qm-section-title">2. Queue Position</h3>
            <div className="qm-field-group">
              <label className="qm-field-label">Leave empty or Auto-assigned</label>
              <input
                type="number"
                min={1}
                {...register("queueNumber", { valueAsNumber: true })}
                placeholder="Auto-assigned"
                className="qm-input"
              />
            </div>

            {/* Auto-assigned Position Preview Card */}
            <div className="qm-card" style={{ marginTop: "6px" }}>
              <div className="qm-icon-circle" style={{ background: "#e0f2fe", color: "#034b6e" }}>
                #{estimatedPosition}
              </div>
              <div className="qm-card-info">
                <span className="qm-card-title">
                  {inputQueueNumber ? `Position #${inputQueueNumber}` : "Auto-assigned"}
                </span>
                <span className="qm-card-sub">
                  Driver will be placed at position #{estimatedPosition} in the {targetVehicleTypeName} queue.
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="qm-footer">
            <button type="button" onClick={onClose} className="qm-btn-cancel">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={isCheckingIn} className="qm-btn-primary">
              {isCheckingIn ? (
                <>
                  <span className="add-docs-spinner" style={{ width: 14, height: 14 }} />
                  {t("checkinModal.checkingIn")}
                </>
              ) : (
                "Check In"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default CheckinModal;

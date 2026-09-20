import { useState, useRef } from "react";
import { Search, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useClickOutside } from "../../../hooks/useClickOutside";
import type { CheckinDriverItem } from "./types";

interface CheckinDriverSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredDrivers: CheckinDriverItem[];
  selectedDriver: CheckinDriverItem | null;
  selectedVehicleDriverUniqueId?: string;
  onSelectDriver: (driver: CheckinDriverItem) => void;
  onDirectIdEnter: (id: string) => void;
  error?: string;
}

export function CheckinDriverSearch({
  searchQuery,
  onSearchChange,
  filteredDrivers,
  selectedDriver,
  selectedVehicleDriverUniqueId,
  onSelectDriver,
  onDirectIdEnter,
  error,
}: CheckinDriverSearchProps) {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useClickOutside(searchWrapRef, () => setDropdownOpen(false), dropdownOpen);

  return (
    <div style={{ marginTop: "6px" }}>
      <h3 className="qm-section-title">{t("checkinModal.vehicleDriverId")}</h3>
      <div className="qm-field-group">
        <label className="qm-field-label">
          {t("checkinModal.searchOrEnterId")}
        </label>
        <div className="qm-input-wrap" ref={searchWrapRef}>
          <Search size={16} className="qm-input-icon" />
          <input
            id="checkin-search-driver"
            name="searchVehicleDriver"
            aria-label={t("checkinModal.searchOrEnterId")}
            type="text"
            value={searchQuery}
            onFocus={() => setDropdownOpen(true)}
            onChange={(e) => {
              const val = e.target.value;
              onSearchChange(val);
              setDropdownOpen(true);
              if (
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  val.trim(),
                )
              ) {
                onDirectIdEnter(val.trim());
              }
            }}
            placeholder={
              selectedDriver
                ? `${selectedDriver.driverName} (${selectedDriver.vehicleDriverUniqueId.slice(0, 7)})`
                : t("checkinModal.searchPlaceholder")
            }
            className="qm-input has-icon"
          />

          {dropdownOpen && (
            <div
              className="dm-dropdown-menu"
              style={{ maxHeight: "180px", overflowY: "auto" }}
            >
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((d) => (
                  <div
                    key={d.vehicleDriverUniqueId}
                    className={`dm-dropdown-item ${selectedVehicleDriverUniqueId === d.vehicleDriverUniqueId ? "selected" : ""}`}
                    style={d.isInQueue ? { opacity: 0.6 } : {}}
                    onClick={() => {
                      if (d.isInQueue) {
                        toast.info(
                          t("checkinModal.alreadyWaiting", {
                            driverName: d.driverName,
                          }),
                        );
                      }
                      onSelectDriver(d);
                      setDropdownOpen(false);
                    }}
                  >
                    <span className="dm-dropdown-item-text">
                      <strong>{d.driverName}</strong>{" "}
                      {d.driverPhoneNumber ? `— ${d.driverPhoneNumber}` : ""}
                    </span>
                    <span
                      className="dm-dropdown-item-badge"
                      style={
                        d.isInQueue
                          ? { background: "#fef3c7", color: "#92400e" }
                          : {}
                      }
                    >
                      {d.isInQueue
                        ? t("checkinModal.alreadyInQueue")
                        : d.vehicleTypeName || t("checkinModal.available")}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "10px 14px",
                    fontSize: "0.8rem",
                    color: "#64748b",
                  }}
                >
                  {t("checkinModal.noMatchingDrivers")}
                </div>
              )}
            </div>
          )}
        </div>
        {error && <p className="qm-error-text">{error}</p>}
      </div>

      {/* Selected Driver Preview Card */}
      {selectedDriver && (
        <div className="qm-card" style={{ marginTop: "6px" }}>
          <div className="qm-icon-circle">
            <User size={20} />
          </div>
          <div className="qm-card-info">
            <span className="qm-card-title">
              {selectedDriver.driverName || t("checkinModal.selectedDriver")}
            </span>
            <span className="qm-card-sub">
              {selectedDriver.driverPhoneNumber || "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

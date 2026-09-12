import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, Truck, User, ChevronDown } from "lucide-react";
import {
  useDispatchQueueMutation,
  useGetShipperRequestsQuery,
  useGetQueueStatusQuery,
  useListVehicleTypesQuery,
} from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { dispatchSchema, type DispatchFormValues } from "../../schemas/queue";
import { resolveVehicleName } from "../../utils/vehicleType";
import { isDriverWaiting } from "../../utils/journeyStatus";
import { useModalA11y } from "../../hooks/useModalA11y";
import MobileHeader from "../common/MobileHeader";
import "./DispatchModal.css";

interface DispatchModalProps {
  queueOrganizationUniqueId: string;
  vehicleTypeId: string;
  vehicleTypeName?: string;
  driverName?: string;
  driverPhone?: string;
  onDispatched?: () => void;
  onClose: () => void;
}

const isUuid = (str?: string) =>
  Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function DispatchModal({
  queueOrganizationUniqueId,
  vehicleTypeId,
  vehicleTypeName,
  driverName,
  driverPhone,
  onDispatched,
  onClose,
}: DispatchModalProps) {
  const { t } = useTranslation();
  const modalRef = useModalA11y<HTMLDivElement>({ isOpen: true, onClose });
  const {
    handleSubmit,
    setValue,
    watch,
  } = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      shipperRequestUniqueId: "",
    },
  });

  const selectedOrderUniqueId = watch("shipperRequestUniqueId");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownWrapRef.current &&
        !dropdownWrapRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: vehicleTypesData } = useListVehicleTypesQuery();
  const vehicleTypesList = vehicleTypesData?.data || [];

  const { data: queueStatusData } = useGetQueueStatusQuery(
    { queueOrganizationUniqueId },
    { skip: !queueOrganizationUniqueId }
  );

  // Resolve valid UUID if vehicleTypeId passed is a name instead of UUID
  let resolvedVehicleTypeId = vehicleTypeId;
  if (!isUuid(resolvedVehicleTypeId)) {
    const matched = vehicleTypesList.find(
      (vt) =>
        vt.vehicleTypeName.toLowerCase() === vehicleTypeId.toLowerCase() ||
        vt.vehicleTypeName.toLowerCase().includes(vehicleTypeId.toLowerCase()) ||
        vehicleTypeId.toLowerCase().includes(vt.vehicleTypeName.toLowerCase()) ||
        (vehicleTypeName && vt.vehicleTypeName.toLowerCase().includes(vehicleTypeName.toLowerCase()))
    );
    if (matched) {
      resolvedVehicleTypeId = matched.vehicleTypeUniqueId;
    }
  }

  // Robust front driver fallback resolution
  const frontDriver = useMemo(() => {
    if (driverName && driverName.trim()) {
      return {
        name: driverName.trim(),
        phone: driverPhone || "",
      };
    }

    if (queueStatusData?.data?.queues) {
      // 1. Search specific matching queue
      for (const [key, entries] of Object.entries(queueStatusData.data.queues)) {
        const isMatch =
          key === resolvedVehicleTypeId ||
          key === vehicleTypeId ||
          (vehicleTypeName && key.toLowerCase().includes(vehicleTypeName.toLowerCase()));

        if (isMatch && Array.isArray(entries) && entries.length > 0) {
          const waiting =
            entries.find((e: any) => isDriverWaiting(e?.status, e?.journeyStatusId)) ||
            entries[0];
          if (waiting) {
            const w = waiting as Record<string, any>;
            const name = w.driverName || w.fullName || w.name || "";
            const phone = w.driverPhoneNumber || w.phoneNumber || w.phone || "";
            if (name) return { name, phone };
          }
        }
      }

      // 2. Search all queues for any waiting driver
      const allEntries = Object.values(queueStatusData.data.queues).flat();
      const waiting =
        allEntries.find((e: any) => isDriverWaiting(e?.status, e?.journeyStatusId)) ||
        allEntries[0];
      if (waiting) {
        const w = waiting as Record<string, any>;
        const name = w.driverName || w.fullName || w.name || "";
        const phone = w.driverPhoneNumber || w.phoneNumber || w.phone || "";
        if (name) return { name, phone };
      }
    }

    return {
      name: t("dispatchModal.waitingDriver"),
      phone: driverPhone || "",
    };
  }, [t, driverName, driverPhone, queueStatusData, resolvedVehicleTypeId, vehicleTypeId, vehicleTypeName]);

  const [dispatchMutation, { isLoading: isDispatching }] = useDispatchQueueMutation();
  const { data: ordersData } = useGetShipperRequestsQuery(
    { queueOrganizationUniqueId, target: "all", page: 1, limit: 50 },
    { skip: !queueOrganizationUniqueId }
  );

  const typeDisplay = resolveVehicleName(vehicleTypeId, vehicleTypeName, vehicleTypesList);

  // Filter pending orders matching this vehicle type
  const availableOrders = useMemo(() => {
    if (!Array.isArray(ordersData?.data)) return [];
    return ordersData.data.filter(
      (o) =>
        (o.shipperRequest?.vehicleTypeUniqueId === resolvedVehicleTypeId ||
         o.shipperRequest?.vehicleTypeUniqueId === vehicleTypeId ||
         !o.shipperRequest?.vehicleTypeUniqueId) &&
        o.shipperRequest?.journeyStatusId === 1
    );
  }, [ordersData, resolvedVehicleTypeId, vehicleTypeId]);

  // Set default initial selected order
  useEffect(() => {
    if (availableOrders.length > 0 && !selectedOrderUniqueId) {
      setValue("shipperRequestUniqueId", availableOrders[0].shipperRequest?.shipperRequestUniqueId || "");
    }
  }, [availableOrders, selectedOrderUniqueId, setValue]);

  // Find currently selected order object
  const activeOrderObj = useMemo(() => {
    if (!selectedOrderUniqueId) {
      return availableOrders[0]?.shipperRequest || null;
    }
    const found = availableOrders.find(
      (o) => o.shipperRequest?.shipperRequestUniqueId === selectedOrderUniqueId
    );
    return found?.shipperRequest || null;
  }, [selectedOrderUniqueId, availableOrders]);

  const selectedOrderLabel = useMemo(() => {
    if (!selectedOrderUniqueId) {
      return t("dispatchModal.directDispatch");
    }
    if (activeOrderObj) {
      const item = activeOrderObj.shippableItemName || t("dispatchModal.cargo");
      const orig = activeOrderObj.originPlace || t("orders.defaultTerminal");
      const dest = activeOrderObj.destinationPlace || t("orders.defaultDestination");
      return t("dispatchModal.orderLabel", { item, origin: orig, destination: dest });
    }
    return t("dispatchModal.directDispatch");
  }, [t, selectedOrderUniqueId, activeOrderObj]);

  const handleFormSubmit = async (values: DispatchFormValues) => {
    try {
      const payload: {
        queueOrganizationUniqueId: string;
        vehicleTypeUniqueId: string;
        shipperRequestUniqueId?: string;
      } = {
        queueOrganizationUniqueId,
        vehicleTypeUniqueId: resolvedVehicleTypeId,
      };

      const cleanShipperReqId = values.shipperRequestUniqueId?.trim();
      if (cleanShipperReqId) {
        payload.shipperRequestUniqueId = cleanShipperReqId;
      }

      console.log("[Dispatch] Sending POST /api/queue/dispatch payload:", payload);
      const res = await dispatchMutation(payload).unwrap();

      const queueNum = res?.data?.queueNumber;
      toast.success(
        res?.message ||
          (queueNum
            ? t("dispatchModal.offerSentWithPosition", { queueNum })
            : t("dispatchModal.offerSent"))
      );
      onDispatched?.();
      onClose();
    } catch (err: unknown) {
      const errObj = typeof err === "object" && err !== null ? (err as Record<string, any>) : null;
      const backendMessage = errObj?.data?.message || errObj?.message;
      if (backendMessage) {
        toast.error(backendMessage);
      } else {
        toast.error(parseError(err));
      }
    }
  };

  return createPortal(
    <div className="dm-overlay">
      <div
        className="dm-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-modal-title"
      >
        {/* Mobile Header */}
        <div className="dm-mobile-header">
          <MobileHeader title={t("dispatchModal.title")} onBack={onClose} />
        </div>

        {/* Desktop Header */}
        <div className="dm-header dm-header--desktop">
          <div>
            <h2 id="dispatch-modal-title" className="dm-title">{t("dispatchModal.title")}</h2>
            <p className="dm-subtitle">{t("dispatchModal.subtitle", { typeName: typeDisplay })}</p>
          </div>
          <button type="button" className="dm-close-btn" onClick={onClose} aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {/* Top 2 Cards: Vehicle Type & Front Waiting Driver */}
          <div className="dm-top-grid">
            <div className="dm-top-group">
              <span className="dm-top-label">{t("dispatchModal.vehicleType")}</span>
              <div className="dm-top-card">
                <div className="dm-icon-circle">
                  <Truck size={20} />
                </div>
                <div className="dm-top-card-info">
                  <span className="dm-top-card-title">{typeDisplay}</span>
                </div>
              </div>
            </div>

            <div className="dm-top-group">
              <span className="dm-top-label">{t("dispatchModal.frontWaitingDriver")}</span>
              <div className="dm-top-card">
                <div className="dm-icon-circle">
                  <User size={20} />
                </div>
                <div className="dm-top-card-info">
                  <span className="dm-top-card-title">{frontDriver.name}</span>
                  {frontDriver.phone ? (
                    <span className="dm-top-card-sub">{frontDriver.phone}</span>
                  ) : (
                    <span className="dm-top-card-sub" style={{ color: "#166534", fontWeight: 500 }}>
                      {t("dispatchModal.frontPosition")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Select Order Section (Custom Dropdown) */}
          <div style={{ marginTop: "14px" }}>
            <h3 className="dm-section-heading">{t("dispatchModal.selectOrder")}</h3>
            <div className="dm-field-group">
              <label className="dm-field-label">{t("dispatchModal.order")}</label>
              <div className="dm-select-wrap" ref={dropdownWrapRef}>
                <button
                  type="button"
                  className={`dm-dropdown-trigger ${dropdownOpen ? "open" : ""}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="dm-dropdown-text">{selectedOrderLabel}</span>
                  <ChevronDown size={18} className={`dm-select-chevron ${dropdownOpen ? "open" : ""}`} />
                </button>

                {dropdownOpen && (
                  <div className="dm-dropdown-menu">
                    <div
                      className={`dm-dropdown-item ${!selectedOrderUniqueId ? "selected" : ""}`}
                      onClick={() => {
                        setValue("shipperRequestUniqueId", "");
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="dm-dropdown-item-text">{t("dispatchModal.directDispatch")}</span>
                    </div>
                    {availableOrders.map(({ shipperRequest }) => {
                      const isSel = selectedOrderUniqueId === shipperRequest.shipperRequestUniqueId;
                      return (
                        <div
                          key={shipperRequest.shipperRequestUniqueId}
                          className={`dm-dropdown-item ${isSel ? "selected" : ""}`}
                          onClick={() => {
                            setValue("shipperRequestUniqueId", shipperRequest.shipperRequestUniqueId);
                            setDropdownOpen(false);
                          }}
                        >
                          <span className="dm-dropdown-item-text">
                            <strong>{shipperRequest.shippableItemName}</strong> — {shipperRequest.originPlace || t("orders.defaultTerminal")} → {shipperRequest.destinationPlace}
                          </span>
                          <span className="dm-dropdown-item-badge">
                            {Number(shipperRequest.shippableItemQtyInQuintal)} Qtl
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary Card */}
          {activeOrderObj && (
            <div className="dm-summary-card">
              <h4 className="dm-summary-title">{t("dispatchModal.orderSummary")}</h4>
              <div className="dm-summary-grid">
                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.table.item")}</span>
                  <span className="dm-summary-val">{activeOrderObj.shippableItemName || t("dispatchModal.generalCargo")}</span>
                </div>
                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.destination")}</span>
                  <span className="dm-summary-val">{activeOrderObj.destinationPlace || "—"}</span>
                </div>

                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.quantityQuintal")}</span>
                  <span className="dm-summary-val">
                    {activeOrderObj.shippableItemQtyInQuintal ? `${Number(activeOrderObj.shippableItemQtyInQuintal)} quintal` : "—"}
                  </span>
                </div>
                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.numberOfVehicles")}</span>
                  <span className="dm-summary-val">1 {typeDisplay}</span>
                </div>

                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.shippingCost")}</span>
                  <span className="dm-summary-val">
                    {activeOrderObj.shippingCost ? `${Number(activeOrderObj.shippingCost).toLocaleString()} ETB` : "—"}
                  </span>
                </div>
                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.shippingDate")}</span>
                  <span className="dm-summary-val">{formatDateDisplay(activeOrderObj.shippingDate)}</span>
                </div>

                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.origin")}</span>
                  <span className="dm-summary-val">{activeOrderObj.originPlace || t("reports.terminalLocation")}</span>
                </div>
                <div className="dm-summary-item">
                  <span className="dm-summary-label">{t("orders.deliveryDate")}</span>
                  <span className="dm-summary-val">{formatDateDisplay(activeOrderObj.deliveryDate)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="dm-footer">
            <button type="button" onClick={onClose} className="dm-btn-cancel">
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={isDispatching} className="dm-btn-dispatch">
              {isDispatching ? (
                <>
                  <span className="add-docs-spinner" style={{ width: 14, height: 14 }} />
                  {t("dispatchModal.dispatching")}
                </>
              ) : (
                t("dispatchModal.dispatchBtn")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default DispatchModal;

import { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
import { Modal } from "../ui/Modal";
import { DispatchTopCards } from "./dispatch/DispatchTopCards";
import { OrderSelectDropdown } from "./dispatch/OrderSelectDropdown";
import { DispatchOrderSummary } from "./dispatch/DispatchOrderSummary";
import "./DispatchModal.css";

export interface DispatchModalProps {
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
    { queueOrganizationUniqueId, target: "all", limit: 100 },
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

  return (
    <Modal
      open={true}
      onClose={onClose}
      variant="dm"
      title={t("dispatchModal.title")}
      subtitle={t("dispatchModal.subtitle", { typeName: typeDisplay })}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* Top 2 Cards: Vehicle Type & Front Waiting Driver */}
        <DispatchTopCards
          typeDisplay={typeDisplay}
          frontDriver={frontDriver}
        />

        {/* Select Order Section (Custom Dropdown) */}
        <OrderSelectDropdown
          availableOrders={availableOrders}
          selectedOrderUniqueId={selectedOrderUniqueId}
          selectedOrderLabel={selectedOrderLabel}
          onSelectOrder={(id) => setValue("shipperRequestUniqueId", id)}
        />

        {/* Order Summary Card */}
        {activeOrderObj && (
          <DispatchOrderSummary
            order={activeOrderObj}
            typeDisplay={typeDisplay}
          />
        )}

        {/* Footer Actions */}
        <div className="dm-footer">
          <button type="button" onClick={onClose} className="dm-btn-cancel">
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={isDispatching}
            className="dm-btn-dispatch"
          >
            {isDispatching ? (
              <>
                <span
                  className="add-docs-spinner"
                  style={{ width: 14, height: 14 }}
                />
                {t("dispatchModal.dispatching")}
              </>
            ) : (
              t("dispatchModal.dispatchBtn")
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default DispatchModal;

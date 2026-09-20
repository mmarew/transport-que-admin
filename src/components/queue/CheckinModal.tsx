import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useManualCheckinMutation } from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { checkinSchema, type CheckinFormValues } from "../../schemas/queue";
import { Modal } from "../ui/Modal";
import { useCheckinData } from "./checkin/useCheckinData";
import { CheckinDriverSearch } from "./checkin/CheckinDriverSearch";
import { CheckinPositionSection } from "./checkin/CheckinPositionSection";
import type { CheckinModalProps, CheckinDriverItem } from "./checkin/types";
import "./QueueModals.css";

export function CheckinModal({
  queueOrganizationUniqueId,
  onCheckedIn,
  onClose,
}: CheckinModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

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

  const [checkinMutation, { isLoading: isCheckingIn }] =
    useManualCheckinMutation();

  const handleInitialDriver = useCallback(
    (id: string) => {
      setValue("vehicleDriverUniqueId", id, { shouldValidate: true });
    },
    [setValue],
  );

  const {
    filteredDrivers,
    selectedDriver,
    estimatedPosition,
    targetVehicleTypeName,
  } = useCheckinData({
    queueOrganizationUniqueId,
    searchQuery,
    selectedVehicleDriverUniqueId,
    inputQueueNumber,
    onInitialDriverSelect: handleInitialDriver,
  });

  const handleSelectDriver = (d: CheckinDriverItem) => {
    setValue("vehicleDriverUniqueId", d.vehicleDriverUniqueId, {
      shouldValidate: true,
    });
    setSearchQuery(
      d.driverPhoneNumber
        ? `${d.driverName} (${d.driverPhoneNumber})`
        : d.driverName,
    );
  };

  const handleDirectIdEnter = (id: string) => {
    setValue("vehicleDriverUniqueId", id, { shouldValidate: true });
  };

  const handleFormSubmit = async (values: CheckinFormValues) => {
    try {
      const res = await checkinMutation({
        queueOrganizationUniqueId,
        vehicleDriverUniqueId: values.vehicleDriverUniqueId,
        ...(values.queueNumber && Number(values.queueNumber) > 0
          ? { queueNumber: Number(values.queueNumber) }
          : {}),
      }).unwrap();

      toast.success(
        res?.message ||
          t("checkinModal.checkedInAt", {
            position: res?.data?.queueNumber ?? 1,
          }),
      );
      onCheckedIn?.();
      onClose();
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      variant="qm"
      title={t("checkinModal.title")}
      subtitle={t("checkinModal.subtitle")}
      mobileHeaderTitle={t("checkinModal.title")}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CheckinDriverSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filteredDrivers={filteredDrivers}
          selectedDriver={selectedDriver}
          selectedVehicleDriverUniqueId={selectedVehicleDriverUniqueId}
          onSelectDriver={handleSelectDriver}
          onDirectIdEnter={handleDirectIdEnter}
          error={errors.vehicleDriverUniqueId?.message}
        />

        <CheckinPositionSection
          register={register}
          inputQueueNumber={inputQueueNumber}
          estimatedPosition={estimatedPosition}
          targetVehicleTypeName={targetVehicleTypeName}
        />

        <div className="qm-footer">
          <button type="button" onClick={onClose} className="qm-btn-cancel">
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={isCheckingIn}
            className="qm-btn-primary"
          >
            {isCheckingIn ? (
              <>
                <span
                  className="add-docs-spinner"
                  style={{ width: 14, height: 14 }}
                />
                {t("checkinModal.checkingIn")}
              </>
            ) : (
              t("checkinModal.checkinBtn")
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CheckinModal;

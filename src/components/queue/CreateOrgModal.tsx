import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import parseError from "@/utils/parseError";
import { setupOrgSchema, type SetupOrgFormValues } from "@/schemas/queue";
import { QUEUE_ORG_TYPES, type QueueOrgType } from "@/types/queue";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { CustomSelect } from "../ui/CustomSelect";
import { Modal } from "../ui/Modal";
import { LocationAutocomplete } from "../ui/LocationAutocomplete";
import type { PhotonPlace } from "@/hooks/usePhotonSearch";
import "./CreateOrderModal.css";

interface CreateOrgModalProps {
  onClose: () => void;
  onCreated?: () => void;
  onCreate: (data: {
    queueOrganizationName: string;
    queueOrganizationType: QueueOrgType;
    queueOrganizationAddress: string;
    latitude: number;
    longitude: number;
    queueOrganizationPhone?: string | null;
  }) => Promise<void>;
}

const ORG_TYPE_LABELS: Record<QueueOrgType, string> = {
  customs: "Customs",
  factory: "Factory",
  cement: "Cement",
  depot: "Depot",
  other: "Other",
};

export function CreateOrgModal({ onClose, onCreated, onCreate }: CreateOrgModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SetupOrgFormValues>({
    resolver: zodResolver(setupOrgSchema),
    defaultValues: {
      queueOrganizationName: "",
      queueOrganizationType: "customs",
      queueOrganizationPhone: "",
      queueOrganizationAddress: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  const [isPending, setIsPending] = useState(false);
  const addressValue = watch("queueOrganizationAddress");

  const handleSelectFeature = (place: PhotonPlace) => {
    setValue("queueOrganizationAddress", place.label, { shouldValidate: true });
    setValue("latitude", place.lat, { shouldValidate: true });
    setValue("longitude", place.lng, { shouldValidate: true });
  };

  const onSubmit = async (values: SetupOrgFormValues) => {
    setIsPending(true);
    try {
      await onCreate({
        queueOrganizationName: values.queueOrganizationName,
        queueOrganizationType: values.queueOrganizationType as QueueOrgType,
        queueOrganizationAddress: values.queueOrganizationAddress,
        latitude: values.latitude || 9.0227,
        longitude: values.longitude || 38.7469,
        queueOrganizationPhone: values.queueOrganizationPhone || null,
      });
      toast.success(t("org.createdSuccess"));
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      console.error("[CreateOrgModal] onCreate error:", err);
      toast.error(parseError(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={t("org.setupTitle")}
      subtitle={t("org.setupSubtitle")}
      mobileHeaderTitle={t("org.createOrg")}
      variant="com"
      style={{ maxWidth: "520px" }}
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        {/* Organization Name */}
        <div className="com-field-group">
          <label className="com-label" htmlFor="create-org-name">
            {t("org.nameLabel")} <span style={{ color: "#E80000" }}>*</span>
          </label>
          <input
            id="create-org-name"
            {...register("queueOrganizationName")}
            placeholder="e.g. Addis Freight Terminal"
            className="com-input"
          />
          {errors.queueOrganizationName && (
            <p className="com-error-text">{errors.queueOrganizationName.message}</p>
          )}
        </div>

        {/* Organization Type */}
        <div className="com-field-group">
          <label className="com-label" htmlFor="create-org-type">
            {t("org.typeLabel")} <span style={{ color: "#E80000" }}>*</span>
          </label>
          <CustomSelect
            id="create-org-type"
            value={watch("queueOrganizationType") || ""}
            onChange={(val) => setValue("queueOrganizationType", val as QueueOrgType, { shouldValidate: true })}
            placeholder={`${t("org.selectType")}...`}
            error={!!errors.queueOrganizationType}
            options={[
              { value: "", label: `${t("org.selectType")}...` },
              ...QUEUE_ORG_TYPES.map((typeKey) => ({
                value: typeKey,
                label: t(`org.types.${typeKey}`, { defaultValue: ORG_TYPE_LABELS[typeKey] }),
              })),
            ]}
          />
          {errors.queueOrganizationType && (
            <p className="com-error-text">{errors.queueOrganizationType.message}</p>
          )}
        </div>

        {/* Contact Phone */}
        <ConstantPhoneInput
          id="modal-org-phone"
          label={t("org.phoneLabel")}
          value={watch("queueOrganizationPhone") || ""}
          onChange={(val) => setValue("queueOrganizationPhone", val, { shouldValidate: true })}
          placeholder="9-XX-XX-XX-XX"
          required={false}
          optional={true}
          error={errors.queueOrganizationPhone?.message}
        />

        {/* Address with LocationAutocomplete */}
        <LocationAutocomplete
          id="create-org-address-search"
          label={t("org.addressLabel")}
          placeholder={t("org.searchAddressPlaceholder")}
          value={addressValue ?? ""}
          onChange={(val) => setValue("queueOrganizationAddress", val, { shouldValidate: true })}
          onSelectPlace={handleSelectFeature}
          error={errors.queueOrganizationAddress?.message}
          required
          variant="com"
        />

        <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            className="com-btn-cancel"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="com-btn-submit"
          >
            {isPending ? t("org.creating") : t("org.createOrg")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateOrgModal;
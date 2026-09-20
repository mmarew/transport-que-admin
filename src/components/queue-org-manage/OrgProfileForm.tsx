import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  queueOrgProfileSchema,
  type QueueOrgProfileFormValues,
} from "../../schemas/queue";
import {
  QUEUE_ORG_TYPES,
  type QueueOrganization,
} from "../../types/queue";

export interface OrgProfileFormProps {
  org: QueueOrganization;
  onSubmit: (values: QueueOrgProfileFormValues) => Promise<void>;
  isUpdating: boolean;
}

export function OrgProfileForm({
  org,
  onSubmit,
  isUpdating,
}: OrgProfileFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<QueueOrgProfileFormValues>({
    resolver: zodResolver(queueOrgProfileSchema),
    values: {
      queueOrganizationName: org.queueOrganizationName,
      queueOrganizationType: org.queueOrganizationType,
      queueOrganizationPhone: org.queueOrganizationPhone ?? "",
      queueOrganizationAddress: org.queueOrganizationAddress ?? "",
      latitude: org.latitude ?? "",
      longitude: org.longitude ?? "",
    },
  });

  return (
    <section className="qom-card">
      <h2 className="qom-card-title">
        <Building2 size={18} color="#0B4D6D" />
        <span>{t("queueManage.orgDetails")}</span>
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="qom-form">
        <div className="qom-field">
          <label className="qom-label">{t("settings.orgName")}</label>
          <input
            {...register("queueOrganizationName")}
            className="qom-input"
          />
          {errors.queueOrganizationName && (
            <p className="qom-error-text">
              {errors.queueOrganizationName.message}
            </p>
          )}
        </div>

        <div className="qom-field">
          <label className="qom-label">{t("queueManage.orgType")}</label>
          <select
            {...register("queueOrganizationType")}
            className="qom-select"
          >
            {QUEUE_ORG_TYPES.map((typeVal) => (
              <option key={typeVal} value={typeVal}>
                {typeVal}
              </option>
            ))}
          </select>
        </div>

        <div className="qom-field">
          <label className="qom-label">{t("queueManage.phoneNumber")}</label>
          <input
            {...register("queueOrganizationPhone")}
            placeholder="+251 9 00 00 00 00"
            className="qom-input"
          />
          {errors.queueOrganizationPhone && (
            <p className="qom-error-text">
              {errors.queueOrganizationPhone.message}
            </p>
          )}
        </div>

        <div className="qom-field">
          <label className="qom-label">{t("queueManage.address")}</label>
          <input
            {...register("queueOrganizationAddress")}
            className="qom-input"
          />
          {errors.queueOrganizationAddress && (
            <p className="qom-error-text">
              {errors.queueOrganizationAddress.message}
            </p>
          )}
        </div>

        <div className="qom-row-2">
          <div className="qom-field">
            <label className="qom-label">{t("orders.latitude")}</label>
            <input
              {...register("latitude")}
              placeholder={t("queueManage.latPlaceholder", "e.g. 8.9806")}
              className="qom-input"
            />
          </div>
          <div className="qom-field">
            <label className="qom-label">{t("orders.longitude")}</label>
            <input
              {...register("longitude")}
              placeholder={t("queueManage.lngPlaceholder", "e.g. 38.7578")}
              className="qom-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isUpdating || !isDirty}
          className="qom-submit-btn"
        >
          {isUpdating ? t("queueManage.saving") : t("settings.saveChanges")}
        </button>
      </form>
    </section>
  );
}

export default OrgProfileForm;

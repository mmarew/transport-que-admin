import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { ConstantPhoneInput } from "../ui/ConstantPhoneInput";
import { AuthLayout } from "../auth/AuthLayout";
import { LocationAutocomplete } from "../ui/LocationAutocomplete";
import { SubmitButton } from "../ui/SubmitButton";
import { useAuth } from "../../context/AuthContext";
import { hasOrganizationData } from "../../services/organization.service";
import { useAppDispatch } from "../../lib/redux/hooks";
import {
  api,
  useCreateQueueOrganizationMutation,
  useListQueueOrganizationsQuery,
} from "../../lib/redux/api";
import parseError from "../../utils/parseError";
import { setupOrgSchema, type SetupOrgFormValues } from "../../schemas/queue";
import { QUEUE_ORG_TYPES, type QueueOrgType } from "../../types/queue";
import type { PhotonPlace } from "@/hooks/usePhotonSearch";
import "../../styles/auth.css";
import "./SetupOrganization.css";

const ORG_TYPE_LABELS: Record<QueueOrgType, string> = {
  customs: "Customs",
  factory: "Factory",
  cement: "Cement",
  depot: "Depot",
  other: "Other",
};

export const SetupOrganization: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const {
    data: orgsData,
    isSuccess,
    isLoading: isOrgsLoading,
    isFetching: isOrgsFetching,
    refetch: refetchOrgs,
  } = useListQueueOrganizationsQuery();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (isSuccess && !isOrgsFetching && hasOrganizationData(orgsData)) {
      navigate("/dashboard", { replace: true });
    }
  }, [isSuccess, isOrgsFetching, orgsData, navigate]);

  const [createOrgMutation, { isLoading: isCreating }] =
    useCreateQueueOrganizationMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SetupOrgFormValues>({
    resolver: zodResolver(setupOrgSchema),
    defaultValues: {
      queueOrganizationName: "",
      queueOrganizationType: undefined,
      queueOrganizationPhone: "",
      queueOrganizationAddress: "",
      latitude: null,
      longitude: null,
    },
  });

  const addressValue = watch("queueOrganizationAddress");

  const handleSelectSuggestion = (place: PhotonPlace) => {
    setValue("queueOrganizationAddress", place.label, { shouldValidate: true });
    setValue("longitude", place.lng);
    setValue("latitude", place.lat);
  };

  const onSubmit = async (data: SetupOrgFormValues) => {
    try {
      await createOrgMutation({
        queueOrganizationName: data.queueOrganizationName,
        queueOrganizationType: data.queueOrganizationType as QueueOrgType,
        queueOrganizationPhone: data.queueOrganizationPhone || null,
        queueOrganizationAddress: data.queueOrganizationAddress,
        latitude: data.latitude,
        longitude: data.longitude,
      }).unwrap();

      toast.success(t("org.createdSuccess"));
      dispatch(api.util.invalidateTags(["QueueOrganizations"]));
      await refetchOrgs();
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      toast.error(parseError(err));
    }
  };

  if (isOrgsLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div className="add-docs-spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  const logoutButton = (
    <button
      type="button"
      onClick={handleLogout}
      className="register-logout-btn"
      aria-label={t("common.logout")}
      title={t("common.logout")}
    >
      <LogOut size={22} />
    </button>
  );

  return (
    <AuthLayout
      title={t("org.setupTitle")}
      subtitle={t("org.setupSubtitle")}
      mobileHeaderAction={logoutButton}
      cardClassName="animate-scale-up"
    >
      <div
        className="login-header login-header--desktop"
        style={{ position: "relative" }}
      >
        <h1>{t("org.setupTitle")}</h1>
        <p>{t("org.setupSubtitle")}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="register-logout-btn-desktop"
          aria-label={t("common.logout")}
          title={t("common.logout")}
        >
          <LogOut size={22} />
        </button>
      </div>

      <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Organization Name */}
        <div className="form-group form-group-mb">
          <label htmlFor="org-name">
            {t("org.nameLabel")} <span style={{ color: "#E80000" }}>*</span>
          </label>
          <div
            className={`input-wrapper${errors.queueOrganizationName ? " input-wrapper--error" : ""}`}
          >
            <input
              id="org-name"
              type="text"
              placeholder="e.g. Addis Freight Terminal"
              autoComplete="organization"
              spellCheck={false}
              {...register("queueOrganizationName")}
            />
          </div>
          {errors.queueOrganizationName && (
            <p className="setup-org-field-error">
              {errors.queueOrganizationName.message}
            </p>
          )}
        </div>

        {/* Organization Type Dropdown */}
        <div className="form-group form-group-mb">
          <label htmlFor="org-type">
            {t("org.typeLabel")} <span style={{ color: "#E80000" }}>*</span>
          </label>
          <div
            className={`input-wrapper setup-org-select-wrapper${errors.queueOrganizationType ? " input-wrapper--error" : ""}`}
          >
            <select
              id="org-type"
              className="setup-org-select"
              {...register("queueOrganizationType")}
            >
              <option value="">{t("org.selectType")}...</option>
              {QUEUE_ORG_TYPES.map((typeKey) => (
                <option key={typeKey} value={typeKey}>
                  {t(`org.types.${typeKey}`, {
                    defaultValue: ORG_TYPE_LABELS[typeKey],
                  })}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="setup-org-select-icon" />
          </div>
          {errors.queueOrganizationType && (
            <p className="setup-org-field-error">
              {errors.queueOrganizationType.message}
            </p>
          )}
        </div>

        {/* Contact Phone */}
        <div className="form-group form-group-mb">
          <ConstantPhoneInput
            id="org-phone"
            label={t("org.phoneLabel")}
            value={watch("queueOrganizationPhone") || ""}
            onChange={(val) =>
              setValue("queueOrganizationPhone", val, {
                shouldValidate: true,
              })
            }
            placeholder="9-XX-XX-XX-XX"
            required={false}
            optional={true}
            error={errors.queueOrganizationPhone?.message}
          />
        </div>

        {/* Address with LocationAutocomplete */}
        <div className="form-group setup-org-address-group">
          <LocationAutocomplete
            id="org-address"
            label={t("org.addressLabel")}
            placeholder={t("org.searchAddressPlaceholder")}
            value={addressValue ?? ""}
            onChange={(val) =>
              setValue("queueOrganizationAddress", val, {
                shouldValidate: true,
              })
            }
            onSelectPlace={handleSelectSuggestion}
            error={errors.queueOrganizationAddress?.message}
            required
            variant="setup"
          />
        </div>

        <SubmitButton
          isLoading={isSubmitting || isCreating}
          loadingText={t("org.creating")}
          className="login-btn"
        >
          {t("org.createOrg")}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
};

export default SetupOrganization;

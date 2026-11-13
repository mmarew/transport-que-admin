import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useListCompaniesQuery } from "@/lib/redux/api";

export interface CompanySelectProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * CompanySelect handles fetching approved companies from GET /api/company/companies?approvalStatus=APPROVED,
 * deduplicating entries, and presenting a CustomSelect for company targeting.
 */
export function CompanySelect({
  value,
  onChange,
  error,
  disabled,
  required = false,
}: CompanySelectProps) {
  const { t } = useTranslation();
  const { data: apiCompanies, isLoading } = useListCompaniesQuery({
    approvalStatus: "APPROVED",
  });

  const companiesList = useMemo(() => {
    const list: Array<{ companyUniqueId: string; companyName: string }> = [];
    const seenIds = new Set<string>();

    const add = (id?: string | null, name?: string | null) => {
      if (!id || typeof id !== "string") return;
      const cleanId = id.trim();
      if (!cleanId) return;
      const cleanName = (name && typeof name === "string" ? name : cleanId).trim();
      if (!seenIds.has(cleanId)) {
        seenIds.add(cleanId);
        list.push({
          companyUniqueId: cleanId,
          companyName: cleanName,
        });
      }
    };

    if (Array.isArray(apiCompanies?.data)) {
      apiCompanies.data.forEach((c) => {
        add(c.companyUniqueId, c.companyName);
      });
    }

    try {
      const rawCached = localStorage.getItem("cachedCompanies");
      if (rawCached) {
        const parsed = JSON.parse(rawCached);
        if (Array.isArray(parsed)) {
          parsed.forEach((c: any) => {
            const id = c.companyUniqueId || c.uniqueId || c.id;
            const name = c.companyName || c.name;
            add(id, name);
          });
        }
      }
    } catch {
      // ignore
    }

    return list.sort((a, b) => a.companyName.localeCompare(b.companyName));
  }, [apiCompanies]);

  useEffect(() => {
    if (apiCompanies?.data && Array.isArray(apiCompanies.data) && apiCompanies.data.length > 0) {
      try {
        localStorage.setItem("cachedCompanies", JSON.stringify(apiCompanies.data));
      } catch {
        // ignore
      }
    }
  }, [apiCompanies?.data]);

  const options = [
    ...(required
      ? [{ value: "", label: t("orders.selectCompany", "Select a company") }]
      : [{
          value: "",
          label: t("orders.allApprovedCompanies", "All Approved Companies (Optional)"),
        }]),
    ...companiesList.map((c) => ({
      value: c.companyUniqueId,
      label: c.companyName,
    })),
  ];

  if (value && !companiesList.some((c) => c.companyUniqueId === value)) {
    options.push({
      value,
      label: value,
    });
  }

  return (
    <div className="com-field-group">
      <label className="com-label">
        {t("orders.targetCompany", "Target Company")}{" "}
        <span className="com-label-optional">
          {required
            ? t("common.required", "(Required)")
            : t("common.optional", "(Optional)")}
        </span>
      </label>
      <CustomSelect
        value={value || ""}
        onChange={onChange}
        placeholder={
          isLoading
            ? t("common.loading", "Loading companies...")
            : required
              ? t("orders.selectCompany", "Select a company")
              : t("orders.selectTargetCompany", "Select target company (optional)")
        }
        error={!!error}
        disabled={disabled}
        options={options}
      />
      {error && <p className="com-error-text">{error}</p>}
    </div>
  );
}

export default CompanySelect;

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useListVehicleTypesQuery } from "@/lib/redux/api";

export interface VehicleTypeSelectProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

import { KNOWN_DB_TYPES, registerDynamicVehicleTypes } from "@/utils/vehicleType";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * VehicleTypeSelect handles fetching vehicle types from API with fallback to known DB UUIDs,
 * deduplicating entries, and presenting a CustomSelect.
 */
export function VehicleTypeSelect({
  value,
  onChange,
  error,
}: VehicleTypeSelectProps) {
  const { t } = useTranslation();
  const { data: apiVehicleTypes } = useListVehicleTypesQuery();

  const vehicleTypesList = useMemo(() => {
    const list: Array<{
      vehicleTypeUniqueId: string;
      vehicleTypeName: string;
      carryingCapacity?: number;
    }> = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const add = (id?: string, name?: string, capacity?: number) => {
      if (!id || !UUID_REGEX.test(id)) return;
      const cleanName = (name || id).trim();
      const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seenIds.has(id) && !seenNames.has(normKey)) {
        seenIds.add(id);
        seenNames.add(normKey);
        list.push({
          vehicleTypeUniqueId: id,
          vehicleTypeName: cleanName,
          carryingCapacity: capacity != null && !isNaN(Number(capacity)) ? Number(capacity) : undefined,
        });
      }
    };

    if (Array.isArray(apiVehicleTypes?.data)) {
      apiVehicleTypes.data.forEach((vt: any) => {
        add(vt.vehicleTypeUniqueId, vt.vehicleTypeName, vt.carryingCapacity);
      });
    }

    KNOWN_DB_TYPES.forEach((vt) =>
      add(vt.vehicleTypeUniqueId, vt.vehicleTypeName, (vt as any).carryingCapacity),
    );

    registerDynamicVehicleTypes(list);
    return list;
  }, [apiVehicleTypes]);

  return (
    <div className="com-field-group">
      <label className="com-label">
        {t("orders.vehicleType", "Vehicle Type")}
      </label>
      <CustomSelect
        value={value || ""}
        onChange={onChange}
        placeholder={t("orders.selectVehicleType", "Select vehicle type")}
        error={!!error}
        options={[
          {
            value: "",
            label: t("orders.selectVehicleType", "Select vehicle type"),
          },
          ...vehicleTypesList.map((vt) => ({
            value: vt.vehicleTypeUniqueId,
            label: vt.vehicleTypeName,
          })),
        ]}
      />
      {error && <p className="com-error-text">{error}</p>}
    </div>
  );
}

export default VehicleTypeSelect;

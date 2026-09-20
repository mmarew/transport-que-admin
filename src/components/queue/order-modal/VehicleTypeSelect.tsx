import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useListVehicleTypesQuery } from "@/lib/redux/api";

export interface VehicleTypeSelectProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}

const KNOWN_DB_TYPES = [
  {
    vehicleTypeUniqueId: "e93aa27f-364f-4eff-bc26-582b773071d3",
    vehicleTypeName: "2×20ft or 40ft Low-Bed Truck (301–350 Quintal)",
  },
  {
    vehicleTypeUniqueId: "9b2e8446-e1b7-4659-89bd-3bbc4c0a6742",
    vehicleTypeName: "20ft Container Truck (251–300 Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000002",
    vehicleTypeName: "ISUZU / Light Cargo (50–100 Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000001",
    vehicleTypeName: "Heavy Duty Trailer (351–400+ Quintal)",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000003",
    vehicleTypeName: "Tanker / Bulk Liquid",
  },
  {
    vehicleTypeUniqueId: "55060ed0-0000-0000-0000-000000000004",
    vehicleTypeName: "Refrigerated Cargo Truck",
  },
];

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
    }> = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const add = (id?: string, name?: string) => {
      if (!id || !UUID_REGEX.test(id)) return;
      const cleanName = (name || id).trim();
      const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seenIds.has(id) && !seenNames.has(normKey)) {
        seenIds.add(id);
        seenNames.add(normKey);
        list.push({ vehicleTypeUniqueId: id, vehicleTypeName: cleanName });
      }
    };

    if (Array.isArray(apiVehicleTypes?.data)) {
      apiVehicleTypes.data.forEach((vt: any) => {
        add(vt.vehicleTypeUniqueId, vt.vehicleTypeName);
      });
    }

    KNOWN_DB_TYPES.forEach((vt) =>
      add(vt.vehicleTypeUniqueId, vt.vehicleTypeName),
    );

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

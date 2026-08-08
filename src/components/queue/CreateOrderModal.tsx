import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReactNode } from "react";
import type { PhotonFeature } from "../../types/queue";
import { createShipperRequest, getApiError } from "../../lib/api";
import { useListVehicleTypesQuery } from "../../lib/redux/api";
import {
  createOrderSchema,
  type CreateOrderFormValues,
} from "../../schemas/queue";

const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";

function photonLabel(feature: PhotonFeature): string {
  const p = feature.properties;
  return (
    [p.name, p.city, p.state, p.country].filter(Boolean).join(", ") ||
    [p.housenumber, p.street].filter(Boolean).join(" ") ||
    p.street ||
    "Unknown place"
  );
}

interface CreateOrderModalProps {
  queueOrganizationUniqueId: string;
  origin?: {
    latitude?: number | null;
    longitude?: number | null;
    description?: string | null;
  };
  onCreated?: () => void;
  onClose: () => void;
}

function newBatchUniqueId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CreateOrderModal({
  queueOrganizationUniqueId,
  origin,
  onCreated,
  onClose,
}: CreateOrderModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      numberOfVehicles: 1,
      requestMode: "individual_target",
      originDescription: origin?.description ?? "",
      originLatitude: origin?.latitude != null ? String(origin.latitude) : "",
      originLongitude: origin?.longitude != null ? String(origin.longitude) : "",
    },
  });

  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<PhotonFeature[]>([]);
  const [destOpen, setDestOpen] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const [selectedDest, setSelectedDest] = useState<{
    description: string;
    latitude: string;
    longitude: string;
  } | null>(null);

  useEffect(() => {
    const q = destQuery.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 3) {
        setDestResults([]);
        setDestLoading(false);
        return;
      }
      setDestLoading(true);
      fetch(`${PHOTON_ENDPOINT}?q=${encodeURIComponent(q)}&limit=5`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Geocoder request failed");
          return res.json();
        })
        .then((data: { features?: PhotonFeature[] }) => {
          setDestResults(data.features ?? []);
        })
        .catch(() => {
          setDestResults([]);
        })
        .finally(() => {
          setDestLoading(false);
        });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [destQuery]);

  const pickDestination = (feature: PhotonFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    const label = photonLabel(feature);
    setValue("destinationDescription", label);
    setValue("destinationLatitude", String(lat));
    setValue("destinationLongitude", String(lng));
    setSelectedDest({
      description: label,
      latitude: String(lat),
      longitude: String(lng),
    });
    setDestQuery(label);
    setDestResults([]);
    setDestOpen(false);
  };

  const {
    data: vehicleTypesData,
    isLoading: isLoadingVehicleTypes,
    isError: isVehicleTypesError,
  } = useListVehicleTypesQuery();

  const mutation = useMutation({
    mutationFn: (values: CreateOrderFormValues) =>
      createShipperRequest({
        shipperRequestBatchUniqueId: newBatchUniqueId(),
        numberOfVehicles: values.numberOfVehicles,
        shippingDate: new Date(`${values.shippingDate}T00:00:00.000Z`).toISOString(),
        deliveryDate: new Date(`${values.deliveryDate}T00:00:00.000Z`).toISOString(),
        shippingCost: values.shippingCost,
        shippableItemQtyInQuintal: values.shippableItemQtyInQuintal,
        shippableItemName: values.shippableItemName,
        shipperPhoneNumber: values.shipperPhoneNumber,
        requestMode: values.requestMode,
        requestType: "shipper",
        queueOrganizationUniqueId,
        originLocation: {
          latitude: Number(values.originLatitude),
          longitude: Number(values.originLongitude),
          description: values.originDescription,
        },
        destination: {
          latitude: Number(values.destinationLatitude),
          longitude: Number(values.destinationLongitude),
          description: values.destinationDescription,
        },
        vehicle: {
          vehicleTypeUniqueId: values.vehicleTypeUniqueId,
        },
      }),
    onSuccess: () => {
      const mode = mutation.variables?.requestMode ?? "individual_target";
      toast.success(
        mode === "company_target"
          ? "Company target batch created (rows deferred until bid acceptance)"
          : "Order created and offered to the queue",
      );
      onCreated?.();
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  const field =
    (label: string, key: keyof CreateOrderFormValues, extra?: ReactNode) =>
    (
      <div>
        <label className="block text-sm font-medium text-slate-700">
          {label} {extra}
        </label>
        <input
          {...register(key)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {errors[key] && (
          <p className="mt-1 text-xs text-red-600">{errors[key]?.message}</p>
        )}
      </div>
    );

  const numberField = (
    label: string,
    key: keyof CreateOrderFormValues,
    extra?: ReactNode,
  ) =>
    (
      <div>
        <label className="block text-sm font-medium text-slate-700">
          {label} {extra}
        </label>
        <input
          type="number"
          step="any"
          {...register(key, { valueAsNumber: true })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {errors[key] && (
          <p className="mt-1 text-xs text-red-600">{errors[key]?.message}</p>
        )}
      </div>
    );

  const dateField = (
    label: string,
    key: "shippingDate" | "deliveryDate",
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type="date"
        {...register(key)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      {errors[key] && (
        <p className="mt-1 text-xs text-red-600">{errors[key]?.message}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-800">New order</h2>
        <p className="mt-1 text-sm text-slate-500">
          A new shipper request is created and offered to the front waiting
          driver of the matching vehicle type.
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-md bg-slate-50 p-3">
            <label className="block text-sm font-medium text-slate-700">
              Request mode
            </label>
            <div className="mt-2 flex gap-4">
              {(
                [
                  ["individual_target", "Individual target"],
                  ["company_target", "Company target"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    value={value}
                    {...register("requestMode")}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Individual target offers the order to the front waiting driver of
              the vehicle type. Company target only creates a batch header —
              driver rows are deferred until a company bid is accepted.
            </p>
            {errors.requestMode && (
              <p className="mt-1 text-xs text-red-600">
                {errors.requestMode.message}
              </p>
            )}
          </div>

          <div className="rounded-md bg-blue-50 px-3 py-2">
            <label className="block text-sm font-medium text-blue-900">
              Shipper phone number <span className="text-red-600">*</span>
            </label>
            <input
              {...register("shipperPhoneNumber")}
              placeholder="e.g. 08012345678"
              className="mt-1 w-full rounded-md border border-blue-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-blue-700">
              Registers the shipper if they do not have an account yet.
            </p>
            {errors.shipperPhoneNumber && (
              <p className="mt-1 text-xs text-red-600">
                {errors.shipperPhoneNumber.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Item name", "shippableItemName")}
            {numberField("Quantity (quintal)", "shippableItemQtyInQuintal")}
            {numberField("Shipping cost", "shippingCost")}
            {numberField("Number of vehicles", "numberOfVehicles")}
            {dateField("Shipping date", "shippingDate")}
            {dateField("Delivery date", "deliveryDate")}
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Vehicle type
              </label>
              <select
                {...register("vehicleTypeUniqueId")}
                disabled={isLoadingVehicleTypes}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60"
              >
                <option value="">
                  {isLoadingVehicleTypes ? "Loading…" : "Select a vehicle type"}
                </option>
                {(vehicleTypesData?.data ?? []).map((vt) => (
                  <option key={vt.vehicleTypeUniqueId} value={vt.vehicleTypeUniqueId}>
                    {vt.vehicleTypeName}
                    {vt.carryingCapacity
                      ? ` (${vt.carryingCapacity} quintal)`
                      : ""}
                  </option>
                ))}
              </select>
              {isVehicleTypesError && (
                <p className="mt-1 text-xs text-red-600">
                  Could not load vehicle types
                </p>
              )}
              {errors.vehicleTypeUniqueId && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.vehicleTypeUniqueId.message}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-md bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Origin
            </p>
            <p className="mb-2 text-xs text-slate-500">
              Set from the organization&apos;s current location.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">{field("Place", "originDescription")}</div>
              {field("Latitude", "originLatitude")}
              {field("Longitude", "originLongitude")}
            </div>
          </div>

          <div className="rounded-md bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Destination
            </p>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700">
                Search place <span className="text-red-600">*</span>
              </label>
              <input
                value={destQuery}
                onChange={(e) => {
                  setDestQuery(e.target.value);
                  setDestOpen(true);
                }}
                placeholder="City, street, landmark…"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {destLoading && (
                <p className="mt-1 text-xs text-slate-500">Searching…</p>
              )}
              {destOpen && destResults.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {destResults.map((feature, index) => (
                    <li key={`${feature.geometry.coordinates.join(",")}-${index}`}>
                      <button
                        type="button"
                        onClick={() => pickDestination(feature)}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        {photonLabel(feature)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700">
                  Place
                </label>
                <input
                  type="hidden"
                  {...register("destinationDescription")}
                />
                <input
                  value={selectedDest?.description ?? ""}
                  readOnly
                  placeholder="No destination selected"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Latitude
                </label>
                <input type="hidden" {...register("destinationLatitude")} />
                <input
                  value={selectedDest?.latitude ?? ""}
                  readOnly
                  placeholder="—"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Longitude
                </label>
                <input type="hidden" {...register("destinationLongitude")} />
                <input
                  value={selectedDest?.longitude ?? ""}
                  readOnly
                  placeholder="—"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500"
                />
              </div>
            </div>
            {errors.destinationDescription && (
              <p className="mt-1 text-xs text-red-600">
                {errors.destinationDescription.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating…" : "Create order"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createQueueOrganization, getApiError } from "../../lib/api";
import { createQueueOrgSchema, type CreateQueueOrgFormValues } from "../../schemas/queue";

interface CreateOrgModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    osm_value?: string;
    osm_key?: string;
    housenumber?: string;
  };
  geometry: { coordinates: [number, number] };
}

export function CreateOrgModal({ onClose, onCreated }: CreateOrgModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CreateQueueOrgFormValues>({
    resolver: zodResolver(createQueueOrgSchema),
    defaultValues: {
      queueOrganizationName: "",
      queueOrganizationType: "other",
      queueOrganizationPhone: "",
      queueOrganizationAddress: "",
      latitude: "",
      longitude: "",
    },
  });

  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  const searchPhoton = useCallback(async (q: string): Promise<void> => {
    if (!q.trim() || q.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setSuggestions(data.features ?? []);
    } catch {
      setSuggestions([]);
    }
  }, []);

useEffect(() => {
    if (debounceRef.current != null) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => searchPhoton(addressQuery), 250);
    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, [addressQuery, searchPhoton]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = (feat: PhotonFeature) => {
    const { properties, geometry } = feat;
    const parts = [
      properties.name,
      properties.street,
      properties.housenumber,
      properties.city,
      properties.postcode,
      properties.country,
    ].filter(Boolean);
    const formatted = parts.join(", ");
    setValue("queueOrganizationAddress", formatted, { shouldValidate: true });
    setValue("latitude", String(geometry.coordinates[1]), { shouldValidate: true });
    setValue("longitude", String(geometry.coordinates[0]), { shouldValidate: true });
    setAddressQuery(formatted);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const mutation = useMutation({
    mutationFn: (values: CreateQueueOrgFormValues) => {
      const body = {
        queueOrganizationName: values.queueOrganizationName,
        queueOrganizationType: values.queueOrganizationType,
        queueOrganizationPhone: values.queueOrganizationPhone || null,
        queueOrganizationAddress: values.queueOrganizationAddress,
        latitude: Number(values.latitude),
        longitude: Number(values.longitude),
      };
      return createQueueOrganization(body);
    },
    onSuccess: () => {
      toast.success("Queue organization created — pending admin approval");
      queryClient.invalidateQueries({ queryKey: ["queue-orgs"] });
      onCreated?.();
      reset();
      onClose();
    },
    onError: (err) => toast.error(getApiError(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-800">Create queue organization</h2>
        <p className="mt-1 text-xs text-slate-500">
          Name, type, and address are required. Admin will approve before dispatch works.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Name <span className="font-normal text-slate-400">(required)</span>
            </label>
            <input
              {...register("queueOrganizationName")}
              placeholder="National Cement"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.queueOrganizationName && (
              <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Type <span className="font-normal text-slate-400">(required)</span>
            </label>
            <select
              {...register("queueOrganizationType")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="customs">Customs</option>
              <option value="factory">Factory</option>
              <option value="cement">Cement</option>
              <option value="depot">Depot</option>
              <option value="other">Other</option>
            </select>
            {errors.queueOrganizationType && (
              <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationType.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              {...register("queueOrganizationPhone")}
              type="tel"
              placeholder="+251912345678"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {errors.queueOrganizationPhone && (
              <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationPhone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Address <span className="font-normal text-slate-400">(required)</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  setValue("queueOrganizationAddress", e.target.value, { shouldValidate: true });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search address (e.g. Bole, Addis Ababa)…"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  ref={suggestionsRef}
                  className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-slate-300 bg-white shadow-lg divide-y divide-slate-200"
                >
                  {suggestions.map((feat, i) => (
                    <li
                      key={i}
                      onClick={() => selectSuggestion(feat)}
                      className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                    >
                      <p className="font-medium text-slate-900">{feat.properties.name ?? "Unnamed"}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[
                          feat.properties.street,
                          feat.properties.housenumber,
                          feat.properties.city,
                          feat.properties.postcode,
                          feat.properties.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.queueOrganizationAddress && (
              <p className="mt-1 text-xs text-red-600">{errors.queueOrganizationAddress.message}</p>
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
            {mutation.isPending ? "Creating…" : "Create organization"}
          </button>
        </div>
      </form>
    </div>
  );
}
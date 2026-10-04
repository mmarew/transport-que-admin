import { useState, useRef, useCallback } from "react";
import { ETHIOPIAN_CITIES } from "@/utils/formatters";

export interface PhotonPlace {
  label: string;
  lat: number;
  lng: number;
  city?: string;
}

const PHOTON_URL =
  import.meta.env.VITE_PHOTON_URL || "https://photon.komoot.io/api/";

export function formatPhotonLabel(feature: any): string {
  const p = feature.properties || {};
  const parts = [
    p.name,
    p.street,
    p.district || p.county,
    p.city || p.town || p.village,
    p.state,
    p.country,
  ].filter(Boolean);
  return parts.length > 0
    ? Array.from(new Set(parts)).join(", ")
    : p.name || p.street || "Location";
}

export function usePhotonSearch(debounceMs: number = 350) {
  const [suggestions, setSuggestions] = useState<PhotonPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const cleanQ = query.trim().toLowerCase();
      if (!cleanQ || cleanQ.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          // Prioritize known major Ethiopian transport hubs (e.g. Kombolcha) matching query
          const localMatches: PhotonPlace[] = ETHIOPIAN_CITIES
            .filter((c) => c.name.toLowerCase().startsWith(cleanQ) || c.name.toLowerCase().includes(cleanQ))
            .map((c) => ({
              label: `${c.name}, ${c.region || "Ethiopia"}`,
              lat: c.lat,
              lng: c.lng,
              city: c.name,
            }));

          const url = `${PHOTON_URL}?q=${encodeURIComponent(query.trim())}&limit=5&bbox=33.0,3.4,48.0,15.0`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Search failed");
          const json = await res.json();
          const features = json.features || [];
          const remotePlaces: PhotonPlace[] = features.map((f: any) => ({
            label: formatPhotonLabel(f),
            lat: f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0] || 0,
            city: f.properties?.city || f.properties?.name,
          }));

          // Merge: place major local hubs at top, followed by remote suggestions without duplicate city names
          const merged: PhotonPlace[] = [...localMatches];
          for (const rp of remotePlaces) {
            const alreadyExists = merged.some(
              (m) =>
                m.label.toLowerCase() === rp.label.toLowerCase() ||
                (m.city && rp.city && m.city.toLowerCase() === rp.city.toLowerCase())
            );
            if (!alreadyExists) {
              merged.push(rp);
            }
          }

          setSuggestions(merged.slice(0, 6));
        } catch {
          // Fallback to local city matches if external search is unavailable
          const fallback: PhotonPlace[] = ETHIOPIAN_CITIES
            .filter((c) => c.name.toLowerCase().startsWith(cleanQ))
            .map((c) => ({
              label: `${c.name}, ${c.region || "Ethiopia"}`,
              lat: c.lat,
              lng: c.lng,
              city: c.name,
            }));
          setSuggestions(fallback);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    },
    [debounceMs],
  );

  const clearSuggestions = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSuggestions([]);
    setIsSearching(false);
  }, []);

  return {
    suggestions,
    isSearching,
    search,
    clearSuggestions,
  };
}

export default usePhotonSearch;

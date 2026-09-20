import { useState, useRef, useCallback } from "react";

export interface PhotonPlace {
  label: string;
  lat: number;
  lng: number;
  city?: string;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

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
  return parts.length > 0 ? Array.from(new Set(parts)).join(", ") : p.name || p.street || "Location";
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

      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const url = `${PHOTON_URL}?q=${encodeURIComponent(query.trim())}&limit=5&bbox=33.0,3.4,48.0,15.0`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("Search failed");
          const json = await res.json();
          const features = json.features || [];
          const places: PhotonPlace[] = features.map((f: any) => ({
            label: formatPhotonLabel(f),
            lat: f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0] || 0,
            city: f.properties?.city || f.properties?.name,
          }));
          setSuggestions(places);
        } catch {
          setSuggestions([]);
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

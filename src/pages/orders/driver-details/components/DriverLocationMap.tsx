import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Plus, Minus, Crosshair } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DriverDetailsModel } from "../driverDetailsMapper";

interface DriverLocationMapProps {
  model: DriverDetailsModel;
}

/**
 * Curated highway corridor waypoints for Ethiopian commercial routes.
 * Ensures that if OSRM is offline or slow, the polyline strictly bends
 * along the authentic Ethiopian highway rather than drawing backwards.
 */
function getCorridorWaypoints(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  corridor: string
): [number, number][] {
  const origin: [number, number] = [originLat, originLng];
  const dest: [number, number] = [destLat, destLng];

  const c = corridor.toLowerCase();
  const isA2 =
    c.includes("a2") ||
    (originLat > 10.5 && destLat < 9.5) ||
    (destLat > 10.5 && originLat < 9.5);
  const isA7 =
    c.includes("a7") ||
    (originLat < 8.8 && originLat > 6.8 && destLat < 8.8 && destLat > 6.8);

  if (isA2) {
    // A2 Highway: Addis Ababa <-> Dessie / Kombolcha
    const standardA2: [number, number][] = [
      [11.081358, 39.740873], // Kombolcha
      [10.4500, 39.9333],    // Karakore
      [10.0125, 39.9011],    // Shewa Robit
      [9.8467, 39.7611],     // Debre Sina
      [9.6792, 39.5325],     // Debre Birhan
      [9.3333, 39.3000],     // Sheno
      [9.0220, 38.7460],     // Addis Ababa
    ];

    if (originLat > destLat) {
      // Heading South (Kombolcha -> Addis Ababa)
      return [origin, ...standardA2.slice(1, -1), dest];
    } else {
      // Heading North (Addis Ababa -> Kombolcha)
      const reversed = [...standardA2].reverse();
      return [origin, ...reversed.slice(1, -1), dest];
    }
  }

  if (isA7) {
    // A7 Expressway: Mojo/Adama <-> Hawassa
    const standardA7: [number, number][] = [
      [8.5889, 39.1231], // Mojo Dry Port
      [8.4333, 39.0333], // Koka
      [7.9333, 38.7167], // Batu / Ziway
      [7.2000, 38.6000], // Shashemene
      [7.0504, 38.4763], // Hawassa
    ];

    if (originLat > destLat) {
      // Heading South (Mojo -> Hawassa)
      return [origin, ...standardA7.slice(1, -1), dest];
    } else {
      // Heading North (Hawassa -> Mojo)
      const reversed = [...standardA7].reverse();
      return [origin, ...reversed.slice(1, -1), dest];
    }
  }

  // General intermediate bend
  const midLat = (originLat + destLat) / 2 + (destLng > originLng ? 0.08 : -0.08);
  const midLng = (originLng + destLng) / 2 + 0.05;
  return [origin, [midLat, midLng], dest];
}

/**
 * Calculates Euclidean / Great-Circle distance between two points in km
 */
function distKm(p1: [number, number], p2: [number, number]): number {
  const dLat = (p2[0] - p1[0]) * 111.32;
  const dLng = (p2[1] - p1[1]) * 111.32 * Math.cos(((p1[0] + p2[0]) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Interpolates a point along a sequence of coordinates by percentage
 */
function interpolateRoute(points: [number, number][], pct: number): {
  travelled: [number, number][];
  remaining: [number, number][];
  currentPos: [number, number];
} {
  if (points.length < 2) {
    const single = points[0] || [9.02, 38.74];
    return { travelled: [single], remaining: [], currentPos: single };
  }

  if (pct >= 1) {
    return {
      travelled: points,
      remaining: [],
      currentPos: points[points.length - 1],
    };
  }

  if (pct <= 0) {
    return {
      travelled: [],
      remaining: points,
      currentPos: points[0],
    };
  }

  // Calculate cumulative distances
  const distances: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distKm(points[i], points[i + 1]);
    totalDist += d;
    distances.push(totalDist);
  }

  const targetDist = totalDist * pct;

  // Find the segment containing targetDist
  let segIdx = 0;
  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDist >= distances[i] && targetDist <= distances[i + 1]) {
      segIdx = i;
      break;
    }
  }

  const pStart = points[segIdx];
  const pEnd = points[segIdx + 1];
  const segDist = distances[segIdx + 1] - distances[segIdx];
  const segRatio = segDist > 0 ? (targetDist - distances[segIdx]) / segDist : 0;

  const currentPos: [number, number] = [
    pStart[0] + (pEnd[0] - pStart[0]) * segRatio,
    pStart[1] + (pEnd[1] - pStart[1]) * segRatio,
  ];

  const travelled: [number, number][] = [
    ...points.slice(0, segIdx + 1),
    currentPos,
  ];

  const remaining: [number, number][] = [
    currentPos,
    ...points.slice(segIdx + 1),
  ];

  return { travelled, remaining, currentPos };
}

export const DriverLocationMap: React.FC<DriverLocationMapProps> = ({ model }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const originLat = model.route.originCoordinates?.lat ?? 9.02;
  const originLng = model.route.originCoordinates?.lng ?? 38.74;
  const destLat = model.route.destinationCoordinates?.lat ?? 8.54;
  const destLng = model.route.destinationCoordinates?.lng ?? 39.27;

  const isTripCompleted =
    model.driverStatus.type === "completed" ||
    model.progressPercentage >= 100 ||
    model.driverStatus.label.toLowerCase().includes("complete");

  const pct = isTripCompleted ? 1 : Math.max(0, Math.min(100, model.progressPercentage)) / 100;

  // Base corridor waypoints (guaranteed accurate direction)
  const defaultWaypoints = useMemo(() => {
    return getCorridorWaypoints(originLat, originLng, destLat, destLng, model.route.corridor);
  }, [originLat, originLng, destLat, destLng, model.route.corridor]);

  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>(defaultWaypoints);

  // Update fallback whenever origin/dest changes
  useEffect(() => {
    setRoadCoordinates(defaultWaypoints);
  }, [defaultWaypoints]);

  // Fetch real OSRM highway road geometry if possible
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchRoadRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;

        if (
          Array.isArray(data.routes?.[0]?.geometry?.coordinates) &&
          data.routes[0].geometry.coordinates.length > 2
        ) {
          const rawCoords = data.routes[0].geometry.coordinates as [number, number][];
          // OSRM returns [longitude, latitude], convert to Leaflet [latitude, longitude]
          const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          setRoadCoordinates(leafletCoords);
        }
      } catch {
        // Safe fallback to corridor waypoints
      }
    }

    const timer = setTimeout(() => {
      fetchRoadRoute();
    }, 150);

    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [originLat, originLng, destLat, destLng]);

  // Interpolate route segments according to progress
  const { travelled, remaining, currentPos } = useMemo(() => {
    return interpolateRoute(roadCoordinates, pct);
  }, [roadCoordinates, pct]);

  // Reset view to bounds
  const handleResetZoom = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const bounds = L.latLngBounds([
      [originLat, originLng],
      [destLat, destLng],
      currentPos,
    ]);
    mapInstanceRef.current.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 13,
    });
  }, [originLat, originLng, destLat, destLng, currentPos]);

  // Initialize Leaflet Map ONCE on mount
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Prevent React 18/19 StrictMode double initialization error
    if ((container as any)._leaflet_id != null) {
      delete (container as any)._leaflet_id;
    }

    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
    });
    mapInstanceRef.current = map;

    // OpenStreetMap standard tile layer
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layersGroupRef.current = layerGroup;

    // Initial fit view
    const initialBounds = L.latLngBounds([
      [originLat, originLng],
      [destLat, destLng],
    ]);
    map.fitBounds(initialBounds, {
      padding: [45, 45],
      maxZoom: 13,
    });

    // Invalidate size to handle flexbox container layout
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      map.remove();
      mapInstanceRef.current = null;
      layersGroupRef.current = null;
      if ((container as any)._leaflet_id != null) {
        delete (container as any)._leaflet_id;
      }
    };
  }, []);

  // Update layers (markers, polylines) whenever route or model changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear previous markers and lines
    layerGroup.clearLayers();

    // 1. Origin Marker
    const originIcon = L.divIcon({
      className: "driver-leaflet-origin-marker",
      html: `
        <div class="driver-leaflet-pin driver-leaflet-pin--start">
          <div class="driver-leaflet-dot"></div>
          <div class="driver-leaflet-card">
            <span class="driver-leaflet-title">${model.route.origin}</span>
            <span class="driver-leaflet-sub">Pickup · ${model.departedTime.replace(" EAT", "")}</span>
          </div>
        </div>
      `,
      iconSize: [140, 42],
      iconAnchor: [8, 8],
    });
    L.marker([originLat, originLng], { icon: originIcon }).addTo(layerGroup);

    // 2. Destination Marker
    const destIcon = L.divIcon({
      className: "driver-leaflet-dest-marker",
      html: `
        <div class="driver-leaflet-pin driver-leaflet-pin--end">
          <div class="driver-leaflet-dot driver-leaflet-dot--dest"></div>
          <div class="driver-leaflet-card">
            <span class="driver-leaflet-title">${model.route.destination}</span>
            <span class="driver-leaflet-sub">${
              isTripCompleted ? "Delivered" : "Delivery"
            } · ${model.estimatedArrival.replace(" EAT", "")}</span>
          </div>
        </div>
      `,
      iconSize: [140, 42],
      iconAnchor: [8, 8],
    });
    L.marker([destLat, destLng], { icon: destIcon }).addTo(layerGroup);

    // 3. Route Polylines
    if (travelled.length > 1) {
      L.polyline(travelled, {
        color: isTripCompleted ? "#16a34a" : "#0B4D6D",
        weight: 6,
        opacity: 0.95,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(layerGroup);
    }

    if (!isTripCompleted && remaining.length > 1) {
      L.polyline(remaining, {
        color: "#7dd3fc",
        weight: 5.5,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(layerGroup);
    }

    // 4. Vehicle Marker
    const vehicleIcon = L.divIcon({
      className: "driver-leaflet-truck-marker",
      html: `
        <div class="driver-leaflet-truck-wrap ${
          isTripCompleted ? "driver-leaflet-truck-wrap--completed" : ""
        }">
          <div class="driver-leaflet-truck-circle" title="${model.driverName} - ${model.driverStatus.label}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
          <div class="driver-leaflet-truck-card">
            <span class="driver-leaflet-truck-name">${model.driverName}</span>
            <span class="driver-leaflet-truck-sub">${
              isTripCompleted
                ? `Completed · Delivered at ${model.route.destination}`
                : `${model.route.corridor} · ${model.remainingDistanceKm} km remaining`
            }</span>
          </div>
        </div>
      `,
      iconSize: [180, 48],
      iconAnchor: [16, 16],
    });

    const markerPos: [number, number] = isTripCompleted ? [destLat, destLng] : currentPos;
    L.marker(markerPos, { icon: vehicleIcon }).addTo(layerGroup);

    // Fit view
    const bounds = L.latLngBounds([
      [originLat, originLng],
      [destLat, destLng],
      currentPos,
    ]);
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 13,
    });
  }, [
    originLat,
    originLng,
    destLat,
    destLng,
    travelled,
    remaining,
    currentPos,
    isTripCompleted,
    model.route.origin,
    model.route.destination,
    model.route.corridor,
    model.departedTime,
    model.estimatedArrival,
    model.driverName,
    model.driverStatus.label,
    model.remainingDistanceKm,
  ]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className="driver-map-card">
      {/* Header */}
      <div className="driver-map-card-header">
        <div className="driver-map-header-left">
          <h3 className="driver-map-card-title">Current location</h3>
          <p className="driver-map-card-subtitle">
            {isTripCompleted
              ? `Trip completed · ${model.currentTimeString}`
              : `Sample update · ${model.currentTimeString}`}
          </p>
        </div>
        <div
          className={`driver-badge-onroute ${
            isTripCompleted ? "driver-badge-onroute--completed" : ""
          }`}
        >
          <span className="driver-badge-dot driver-badge-dot--green" />
          <span>{model.driverStatus.label}</span>
        </div>
      </div>

      {/* Real Interactive Leaflet Map Canvas */}
      <div className="driver-map-canvas-wrapper">
        <div ref={mapContainerRef} className="driver-leaflet-container" />

        {/* Floating Zoom & Reset Controls */}
        <div className="driver-map-controls">
          <button
            type="button"
            className="driver-map-ctrl-btn"
            onClick={handleZoomIn}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="driver-map-ctrl-btn"
            onClick={handleZoomOut}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            className="driver-map-ctrl-btn"
            onClick={handleResetZoom}
            title="Reset location view"
            aria-label="Reset location view"
          >
            <Crosshair size={14} />
          </button>
        </div>

        {/* Live Route Disclaimer Badge */}
        <div className="driver-map-badge-disclaimer">
          {isTripCompleted
            ? "Completed route · Not for navigation"
            : "Illustrative route · Not for navigation"}
        </div>
      </div>

      {/* Map Legend Bar */}
      <div className="driver-map-legend-bar">
        <div className="driver-map-legend-left">
          <div className="driver-map-legend-item">
            <span
              className={`driver-map-legend-swatch ${
                isTripCompleted
                  ? "driver-map-legend-swatch--completed"
                  : "driver-map-legend-swatch--travelled"
              }`}
            />
            <span>{isTripCompleted ? "Delivered" : "Travelled"}</span>
          </div>
          {!isTripCompleted && (
            <div className="driver-map-legend-item">
              <span className="driver-map-legend-swatch driver-map-legend-swatch--remaining" />
              <span>Remaining</span>
            </div>
          )}
        </div>
        <div className="driver-map-legend-speed">
          Speed · {model.speedKmh} km/h
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="driver-map-card-footer">
        {isTripCompleted ? (
          <>
            <div className="driver-map-eta-text driver-map-eta-text--completed">
              Delivered · <strong>{model.estimatedArrival}</strong>
            </div>
            <div className="driver-map-remaining-time">
              Cargo delivered successfully · On schedule
            </div>
          </>
        ) : (
          <>
            <div className="driver-map-eta-text">
              Estimated arrival · <strong>{model.estimatedArrival}</strong>
            </div>
            <div className="driver-map-remaining-time">
              {model.remainingMinutes} min to delivery
            </div>
          </>
        )}
      </div>
    </div>
  );
};

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { useTranslation } from "@/i18n/useTranslation";
import type { GeoPoint } from "@/features/workouts/types";

interface Props {
  route: GeoPoint[];
  height?: number;
  className?: string;
  // Live tracking gets pan/zoom; a small feed thumbnail doesn't (avoids
  // trapping page scroll inside a small embedded map).
  interactive?: boolean;
}

// Re-fits the view whenever the route grows -- handles both a live,
// growing route (GPS tracking in progress) and a static, already-complete
// one (viewing a saved entry) with the same effect.
function AutoFit({ route }: { route: GeoPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (route.length === 0) return;
    if (route.length === 1) {
      map.setView([route[0].lat, route[0].lng], 16);
      return;
    }
    map.fitBounds(
      route.map((p) => [p.lat, p.lng] as [number, number]),
      { padding: [24, 24] },
    );
  }, [route, map]);

  return null;
}

// CircleMarker (SVG-drawn) rather than the default Leaflet pin -- avoids the
// well-known bundler issue where Leaflet's default marker image assets
// resolve to broken relative URLs under Vite.
export default function WorkoutRouteMap({ route, height = 200, className = "", interactive = false }: Props) {
  const { t } = useTranslation();

  if (route.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 ${className}`}
        style={{ height }}
      >
        {t("workouts.noRouteYet")}
      </div>
    );
  }

  const center: [number, number] = [route[0].lat, route[0].lng];
  const positions: [number, number][] = route.map((p) => [p.lat, p.lng]);
  const last = route[route.length - 1];

  return (
    <div className={`overflow-hidden rounded-xl ${className}`} style={{ height }}>
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
      >
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={positions} pathOptions={{ color: "#7c3aed", weight: 4 }} />
        <CircleMarker center={[last.lat, last.lng]} radius={7} pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 1 }} />
        <AutoFit route={route} />
      </MapContainer>
    </div>
  );
}

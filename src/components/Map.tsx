"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LEVEL_COLOR, LEVEL_LABEL, type CoverageLevel } from "@/lib/coverage";
import type { AvailabilityStatus, ProductAvailability } from "@/lib/stock";

export type MapItem = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  level: CoverageLevel;
  coverage: { found: number; total: number };
  distanceKm: number;
  products: ProductAvailability[];
};

interface MapProps {
  center: [number, number];
  userPosition: [number, number] | null;
  radiusKm: number;
  items: MapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_STYLE: Record<AvailabilityStatus, { label: string; color: string }> = {
  available: { label: "✓ dispo", color: "#16a34a" },
  unavailable: { label: "✗ non dispo", color: "#dc2626" },
  unknown: { label: "? inconnu", color: "#6b7280" },
};

const userIcon = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Recentre sur la position utilisateur quand le centre / rayon changent. */
function Recenter({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    const zoom = radiusKm <= 1 ? 15 : radiusKm <= 2 ? 14 : radiusKm <= 4 ? 13 : 12;
    map.setView(center, zoom);
  }, [map, center, radiusKm]);
  return null;
}

/** Au changement de sélection : zoom sur la pharmacie + ouverture de sa popup. */
function SelectionFocus({
  selectedId,
  items,
  markerRefs,
}: {
  selectedId: string | null;
  items: MapItem[];
  markerRefs: React.RefObject<Record<string, L.CircleMarker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const item = items.find((i) => i.id === selectedId);
    if (!item) return;
    map.flyTo([item.lat, item.lng], Math.max(map.getZoom(), 16), { duration: 0.5 });
    // Ouvre la popup (après le démarrage du déplacement).
    const layer = markerRefs.current?.[selectedId];
    layer?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);
  return null;
}

function PharmacyPopup({ p }: { p: MapItem }) {
  const itineraryUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  const searched = p.coverage.total > 0;
  return (
    <div style={{ minWidth: 200 }}>
      <strong style={{ fontSize: 14 }}>{p.name}</strong>
      <div style={{ color: "#4b5563", marginTop: 2 }}>{p.address}</div>
      <div style={{ color: "#4b5563" }}>
        {p.distanceKm.toFixed(2)} km · {p.hours}
      </div>

      {searched && (
        <div style={{ marginTop: 6 }}>
          <span style={{ fontWeight: 600, color: LEVEL_COLOR[p.level] }}>
            {p.coverage.found}/{p.coverage.total} — {LEVEL_LABEL[p.level]}
          </span>
          <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none" }}>
            {p.products.map((pr: ProductAvailability) => (
              <li key={pr.medication} style={{ color: STATUS_STYLE[pr.status].color }}>
                {pr.medication} — {STATUS_STYLE[pr.status].label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <a
        href={itineraryUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", marginTop: 6, color: "#2563eb", fontWeight: 500 }}
      >
        Itinéraire ↗
      </a>
    </div>
  );
}

export default function Map({
  center,
  userPosition,
  radiusKm,
  items,
  selectedId,
  onSelect,
}: MapProps) {
  const markerRefs = useRef<Record<string, L.CircleMarker>>({});

  return (
    <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
      <Recenter center={center} radiusKm={radiusKm} />
      <SelectionFocus selectedId={selectedId} items={items} markerRefs={markerRefs} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {userPosition && (
        <>
          <Marker position={userPosition} icon={userIcon}>
            <Popup>Ma position</Popup>
          </Marker>
          <Circle
            center={userPosition}
            radius={radiusKm * 1000}
            pathOptions={{ color: "#2563eb", weight: 1, fillOpacity: 0.06 }}
          />
        </>
      )}

      {items.map((p) => {
        const selected = p.id === selectedId;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={selected ? 13 : 9}
            ref={(layer) => {
              if (layer) markerRefs.current[p.id] = layer;
              else delete markerRefs.current[p.id];
            }}
            pathOptions={{
              color: selected ? "#111827" : "#ffffff",
              weight: selected ? 3 : 2,
              fillColor: LEVEL_COLOR[p.level],
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup>
              <PharmacyPopup p={p} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

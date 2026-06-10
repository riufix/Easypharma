"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { AvailabilityStatus } from "@/lib/stock";

export type MapPharmacy = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: AvailabilityStatus;
};

interface MapProps {
  center: [number, number];
  zoom?: number;
  pharmacies: MapPharmacy[];
}

const STATUS_COLOR: Record<AvailabilityStatus, string> = {
  available: "#16a34a", // vert
  unavailable: "#dc2626", // rouge
  unknown: "#9ca3af", // gris
};

const STATUS_LABEL: Record<AvailabilityStatus, string> = {
  available: "Disponible",
  unavailable: "Non disponible",
  unknown: "Inconnu",
};

export default function Map({ center, zoom = 12, pharmacies }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pharmacies.map((p) => {
        const color = STATUS_COLOR[p.status];
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={11}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {p.address}
              <br />
              <span style={{ color, fontWeight: 600 }}>
                {STATUS_LABEL[p.status]}
              </span>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

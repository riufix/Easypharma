"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const pharmacyIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#16a34a;border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.4);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;font-weight:700;color:#fff;line-height:1;
  ">✚</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// Fix default marker icons broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapProps {
  center?: [number, number];
  zoom?: number;
}

interface Pharmacy{
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    opening_hours?: string;
  };
}

function FlyToUser({ userPos, zoom }: { userPos: [number, number] | null; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (userPos) map.flyTo(userPos, zoom);
  }, [userPos, zoom, map]);
  return null;
}

export default function Map({ center = [48.8566, 2.3522], zoom = 13 }: MapProps) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radius, setRadius] = useState(1000); // 1km radius
  const [Pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserPos([coords.latitude, coords.longitude]),
      (err) => setGeoError(
        err.code === 1
          ? "Permission de géolocalisation refusée. Autorisez l'accès à votre position dans les paramètres du navigateur."
          : "Impossible d'obtenir votre position (vérifiez que vous êtes sur HTTPS ou localhost)."
      )
    );
  }, []);

  useEffect(() => {
    if (!userPos) return;
    const [lat, lon] = userPos;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const body = `[out:json];node["amenity"="pharmacy"](around:${radius},${lat},${lon});out body;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body,
        });
        if (!res.ok) {
          console.warn("Overpass API error:", res.status, res.statusText);
          return;
        }
        const data = await res.json();
        setPharmacies(data.elements ?? []);
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [userPos, radius]);

  return (
    <div style={{position: "relative", height: "100%", width: "100%"}}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToUser userPos={userPos} zoom={zoom} />
        <Marker position={center}>
          <Popup>Position par défaut</Popup>
        </Marker>
        {userPos && (
          <>
            <Marker position={userPos}>
              <Popup>Votre position</Popup>
            </Marker>
            <Circle
              center={userPos}
              radius={radius}
              pathOptions={{ color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 0.15, weight: 2 }}
            />
          </>
        )}
        {Pharmacies.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lon]} icon={pharmacyIcon}>
            <Popup>
              <strong>{p.tags.name ?? "Pharmacie"}</strong>
              {p.tags.opening_hours && <><br />{p.tags.opening_hours}</>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {geoError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg px-4 py-2 shadow max-w-xs text-center">
          {geoError}
        </div>
      )}
      {userPos && (
        <div className="absolute bottom-5 right-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3 flex flex-col items-center gap-2 border border-gray-200">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone de détection</span>
          <span className="text-base font-bold text-blue-600">
            {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
            {loading && <span className="ml-2 text-gray-400 text-xs font-normal">…</span>}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setRadius((r) => Math.max(250, r - 250))}
              disabled={radius <= 250}
              className="w-9 h-9 rounded-lg bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed text-blue-700 text-xl font-bold transition-colors"
              aria-label="Diminuer le rayon"
            >
              −
            </button>
            <button
              onClick={() => setRadius((r) => Math.min(5000, r + 250))}
              disabled={radius >= 5000}
              className="w-9 h-9 rounded-lg bg-blue-100 hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed text-blue-700 text-xl font-bold transition-colors"
              aria-label="Augmenter le rayon"
            >
              +
            </button>
          </div>
          <span className="text-xs text-gray-400">{Pharmacies.length} pharmacie{Pharmacies.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}

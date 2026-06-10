"use client";

import { useState } from "react";

export type Position = { lat: number; lng: number; label: string };

interface PositionControlProps {
  position: Position | null;
  onResolved: (pos: Position) => void;
}

/**
 * Définition de la position de l'utilisateur :
 *  - géolocalisation navigateur (navigator.geolocation) ;
 *  - repli : saisie d'adresse géocodée via l'API Adresse (BAN), gratuite/publique.
 * Gère les états : refus de géoloc, chargement, erreur.
 */
export default function PositionControl({ position, onResolved }: PositionControlProps) {
  const [address, setAddress] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "notfound" | "error">("idle");

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("idle");
        onResolved({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Ma position",
        });
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function geocodeAddress(e: React.FormEvent) {
    e.preventDefault();
    const q = address.trim();
    if (!q) return;
    setGeocodeStatus("loading");
    try {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) {
        setGeocodeStatus("notfound");
        return;
      }
      const [lng, lat] = feature.geometry.coordinates;
      setGeocodeStatus("idle");
      onResolved({ lat, lng, label: feature.properties.label ?? q });
    } catch {
      setGeocodeStatus("error");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={useMyLocation}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        {geoStatus === "loading" ? "Localisation…" : "📍 Utiliser ma position"}
      </button>

      {geoStatus === "denied" && (
        <p className="text-xs text-amber-600">
          Géolocalisation refusée — saisissez une adresse ci-dessous.
        </p>
      )}
      {geoStatus === "error" && (
        <p className="text-xs text-amber-600">
          Géolocalisation indisponible — saisissez une adresse ci-dessous.
        </p>
      )}

      <form onSubmit={geocodeAddress}>
        <label htmlFor="address-input" className="sr-only">
          Adresse
        </label>
        <div className="flex gap-2">
          <input
            id="address-input"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="…ou saisir une adresse (ex. 10 rue de Rivoli, Paris)"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {geocodeStatus === "loading" ? "…" : "OK"}
          </button>
        </div>
      </form>

      {geocodeStatus === "notfound" && (
        <p className="text-xs text-amber-600">Adresse introuvable.</p>
      )}
      {geocodeStatus === "error" && (
        <p className="text-xs text-amber-600">Erreur de géocodage, réessayez.</p>
      )}

      {position && (
        <p className="text-xs text-gray-500">
          Position : <span className="font-medium text-gray-700">{position.label}</span>
        </p>
      )}
    </div>
  );
}

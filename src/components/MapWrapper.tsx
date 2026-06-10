"use client";

import dynamic from "next/dynamic";
import type { MapItem } from "./Map";

// Gotcha Leaflet + Next.js : Leaflet a besoin de `window`, donc import dynamique
// avec ssr: false (dans un Client Component — seul endroit où c'est autorisé).
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100 text-gray-500">
      Chargement de la carte…
    </div>
  ),
});

interface MapWrapperProps {
  center: [number, number];
  userPosition: [number, number] | null;
  radiusKm: number;
  items: MapItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <Map {...props} />;
}

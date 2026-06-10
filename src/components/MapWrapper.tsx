"use client";

import dynamic from "next/dynamic";
import type { MapPharmacy } from "./Map";

// Gotcha Leaflet + Next.js : Leaflet a besoin de `window`, donc on importe le
// composant carte en dynamic import avec ssr: false (sinon erreur au rendu
// serveur). Ce wrapper est un Client Component — ssr: false n'est autorisé que
// hors Server Component dans cette version de Next.js.
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
  zoom?: number;
  pharmacies: MapPharmacy[];
}

export default function MapWrapper(props: MapWrapperProps) {
  return <Map {...props} />;
}

"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-100 text-gray-500">
      Chargement de la carte…
    </div>
  ),
});

interface MapWrapperProps {
  center?: [number, number];
  zoom?: number;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <Map {...props} />;
}

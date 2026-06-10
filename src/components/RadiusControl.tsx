"use client";

interface RadiusControlProps {
  radiusKm: number;
  onChange: (km: number) => void;
}

/** Slider de rayon de recherche (0,5 à 10 km). */
export default function RadiusControl({ radiusKm, onChange }: RadiusControlProps) {
  return (
    <div>
      <label htmlFor="radius-input" className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700">
        <span>Rayon de recherche</span>
        <span className="font-semibold text-blue-700">{radiusKm.toFixed(1)} km</span>
      </label>
      <input
        id="radius-input"
        type="range"
        min={0.5}
        max={10}
        step={0.5}
        value={radiusKm}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

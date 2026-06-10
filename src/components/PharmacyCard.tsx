"use client";

import type { SearchResultPharmacy } from "@/app/api/search/route";
import type { AvailabilityStatus } from "@/lib/stock";
import { coverageLevel, LEVEL_COLOR, LEVEL_LABEL } from "@/lib/coverage";

const STATUS_STYLE: Record<AvailabilityStatus, { label: string; cls: string }> = {
  available: { label: "✓ dispo", cls: "bg-green-100 text-green-800" },
  unavailable: { label: "✗ non dispo", cls: "bg-red-100 text-red-800" },
  unknown: { label: "? inconnu", cls: "bg-gray-100 text-gray-600" },
};

interface PharmacyCardProps {
  result: SearchResultPharmacy;
  selected: boolean;
  onSelect: () => void;
}

export default function PharmacyCard({ result, selected, onSelect }: PharmacyCardProps) {
  const level = coverageLevel(result.coverage);
  const searched = result.coverage.total > 0;
  const itineraryUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lng}`;

  return (
    <li id={`pharma-${result.id}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`w-full rounded border p-3 text-left shadow-sm transition ${
          selected ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-400"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">{result.name}</p>
            <p className="text-xs text-gray-500">{result.address}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {result.distanceKm.toFixed(2)} km · {result.hours}
            </p>
          </div>
          {searched && (
            <span
              className="shrink-0 rounded px-2 py-1 text-sm font-semibold text-white"
              style={{ backgroundColor: LEVEL_COLOR[level] }}
              title={LEVEL_LABEL[level]}
            >
              {result.coverage.found}/{result.coverage.total}
            </span>
          )}
        </div>

        {searched && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {result.products.map((p) => {
              const s = STATUS_STYLE[p.status];
              return (
                <li
                  key={p.medication}
                  className={`rounded px-1.5 py-0.5 text-xs ${s.cls}`}
                  title={s.label}
                >
                  {p.medication} — {s.label}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2 flex items-center justify-between">
          <a
            href={itineraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Itinéraire ↗
          </a>
          {result.updatedAt && (
            <span className="text-[11px] text-gray-400">
              Stock vérifié à {new Date(result.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

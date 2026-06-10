"use client";

import { useState } from "react";
import MapWrapper from "@/components/MapWrapper";
import type { MapPharmacy } from "@/components/Map";
import { PHARMACIES, MAP_CENTER } from "@/data/pharmacies";
import type {
  AvailabilityResponse,
  AvailabilityResult,
} from "@/app/api/availability/route";
import type { AvailabilityStatus } from "@/lib/stock";

const STATUS_META: Record<
  AvailabilityStatus,
  { label: string; dot: string; text: string }
> = {
  available: { label: "Disponible", dot: "bg-green-600", text: "text-green-700" },
  unavailable: { label: "Non disponible", dot: "bg-red-600", text: "text-red-700" },
  unknown: { label: "Inconnu", dot: "bg-gray-400", text: "text-gray-500" },
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [results, setResults] = useState<AvailabilityResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const medication = query.trim();
    if (!medication) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/availability?medication=${encodeURIComponent(medication)}`,
      );
      if (!res.ok) throw new Error(`Erreur API (HTTP ${res.status})`);
      const data: AvailabilityResponse = await res.json();
      setResults(data.results);
      setSearched(medication);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  // Statut par pharmacie : "unknown" tant qu'aucune recherche n'a abouti.
  const statusById = new Map<string, AvailabilityStatus>(
    results?.map((r) => [r.pharmacy.id, r.status]) ?? [],
  );

  const mapPharmacies: MapPharmacy[] = PHARMACIES.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    status: statusById.get(p.id) ?? "unknown",
  }));

  return (
    <main className="flex h-screen flex-col">
      <header className="bg-blue-600 px-4 py-3 text-white">
        <h1 className="text-xl font-semibold">EasyPharma — POC lecture de stock</h1>
        <p className="text-sm text-blue-100">
          Disponibilité d&apos;un médicament en pharmacie (données de stock simulées)
        </p>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Panneau gauche : recherche + liste */}
        <section className="flex w-full flex-col overflow-y-auto border-r border-gray-200 p-4 md:w-96">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom du médicament (ex. Doliprane)"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "…" : "Rechercher"}
            </button>
          </form>

          <p className="mt-2 text-xs text-gray-400">
            Essayez : Doliprane, Amoxicilline, Ventoline, Spasfon, Levothyrox.
          </p>

          {error && (
            <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {results && (
            <p className="mt-3 text-sm text-gray-600">
              Résultats pour <strong>« {searched} »</strong> :
            </p>
          )}

          <ul className="mt-2 space-y-2">
            {(results
              ? results.map((r) => ({
                  ...r.pharmacy,
                  status: r.status,
                  errMsg: r.error,
                }))
              : PHARMACIES.map((p) => ({
                  ...p,
                  status: "unknown" as AvailabilityStatus,
                  errMsg: undefined as string | undefined,
                }))
            ).map((p) => {
              const meta = STATUS_META[p.status];
              return (
                <li
                  key={p.id}
                  className="rounded border border-gray-200 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.address}</p>
                    </div>
                    <span
                      className={`flex shrink-0 items-center gap-1.5 text-sm font-medium ${meta.text}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  {p.errMsg && (
                    <p className="mt-1 text-xs text-amber-600">{p.errMsg}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Panneau droit : carte */}
        <div className="h-64 flex-1 md:h-auto">
          <MapWrapper center={MAP_CENTER} zoom={12} pharmacies={mapPharmacies} />
        </div>
      </div>
    </main>
  );
}

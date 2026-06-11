"use client";

import { useCallback, useEffect, useState } from "react";
import MapWrapper from "@/components/MapWrapper";
import type { MapItem } from "@/components/Map";
import SearchBar from "@/components/SearchBar";
import PositionControl, { type Position } from "@/components/PositionControl";
import RadiusControl from "@/components/RadiusControl";
import PharmacyCard from "@/components/PharmacyCard";
import DemoBanner from "@/components/DemoBanner";
import { DEFAULT_CENTER } from "@/data/pharmacies";
import { coverageLevel } from "@/lib/coverage";
import type { SearchResponse } from "@/app/api/search/route";

export default function Home() {
  const [medications, setMedications] = useState<string[]>([]);
  const [position, setPosition] = useState<Position | null>(null);
  const [radiusKm, setRadiusKm] = useState(2);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    if (!position) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications,
          lat: position.lat,
          lng: position.lng,
          radiusKm,
        }),
      });
      if (!res.ok) throw new Error(`Erreur API (HTTP ${res.status})`);
      setResponse(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [position, medications, radiusKm]);

  // Recherche automatique (débattue) dès qu'une position est connue et à chaque
  // changement de médicaments / rayon / position.
  useEffect(() => {
    if (!position) return;
    // Débounce un peu généreux : le chargement par zone (Overpass) est plus lent
    // qu'un jeu statique, et on évite de le solliciter à chaque cran du slider.
    const t = setTimeout(runSearch, 500);
    return () => clearTimeout(t);
  }, [position, medications, radiusKm, runSearch]);

  // Sync carte → liste : scroll vers la fiche sélectionnée.
  useEffect(() => {
    if (!selectedId) return;
    document.getElementById(`pharma-${selectedId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedId]);

  const results = response?.results ?? [];
  const center: [number, number] = position ? [position.lat, position.lng] : DEFAULT_CENTER;
  const searched = medications.length > 0;

  // Quand une recherche est active, on masque (liste + carte) les pharmacies qui
  // n'ont AUCUN des médicaments recherchés : seules les pharmacies utiles restent.
  // Sans recherche, on montre toutes les pharmacies du rayon.
  const visibleResults = searched
    ? results.filter((r) => r.coverage.found > 0)
    : results;
  const hiddenCount = results.length - visibleResults.length;

  const mapItems: MapItem[] = visibleResults.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    hours: r.hours,
    level: coverageLevel(r.coverage),
    coverage: r.coverage,
    distanceKm: r.distanceKm,
    products: r.products,
  }));

  // Tri de la liste : d'abord le plus de médicaments trouvés (couverture), puis le
  // plus proche en cas d'égalité. Sans recherche, on reste sur la distance.
  const listResults = [...visibleResults].sort((a, b) => {
    if (searched && b.coverage.found !== a.coverage.found) {
      return b.coverage.found - a.coverage.found;
    }
    return a.distanceKm - b.distanceKm;
  });

  return (
    <main className="flex h-screen flex-col">
      <header className="bg-blue-600 px-4 py-3 text-white">
        <h1 className="text-xl font-semibold">EasyPharma</h1>
        <p className="text-sm text-blue-100">
          Trouvez une pharmacie proche qui a vos médicaments en stock
        </p>
      </header>
      <DemoBanner />

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Panneau gauche : contrôles + liste */}
        <section className="flex w-full flex-col gap-4 overflow-y-auto border-r border-gray-200 p-4 md:w-[26rem]">
          <SearchBar
            medications={medications}
            onChange={setMedications}
            mocked={response?.mocked ?? true}
          />
          <PositionControl position={position} onResolved={setPosition} />
          {position && <RadiusControl radiusKm={radiusKm} onChange={setRadiusKm} />}

          {/* États */}
          {!position && (
            <p className="rounded bg-blue-50 p-3 text-sm text-blue-800">
              Indiquez votre position (ou une adresse) pour voir les pharmacies proches.
            </p>
          )}
          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          {response?.stockError && (
            <p className="rounded bg-amber-50 p-3 text-xs text-amber-800">
              Stock indisponible via le connecteur ({response.stockError}). Statuts
              affichés en « inconnu ».
            </p>
          )}

          {position && (
            <div className="flex-1">
              {loading && <p className="text-sm text-gray-500">Recherche…</p>}

              {!loading && results.length === 0 && (
                <p className="rounded bg-gray-50 p-3 text-sm text-gray-600">
                  Aucune pharmacie dans ce rayon. Augmentez le rayon de recherche.
                </p>
              )}

              {!loading && results.length > 0 && visibleResults.length === 0 && (
                <p className="rounded bg-gray-50 p-3 text-sm text-gray-600">
                  Aucune des {results.length} pharmacie{results.length > 1 ? "s" : ""} de ce
                  rayon n&apos;a les médicaments recherchés. Augmentez le rayon ou modifiez la
                  recherche.
                </p>
              )}

              {!loading && visibleResults.length > 0 && (
                <>
                  <p className="mb-1 text-sm text-gray-600">
                    {searched
                      ? `${visibleResults.length} pharmacie${visibleResults.length > 1 ? "s" : ""} avec au moins un médicament`
                      : response?.truncatedFrom
                        ? `${visibleResults.length} pharmacies les plus proches (sur ${response.truncatedFrom} dans le rayon)`
                        : `${visibleResults.length} pharmacie${visibleResults.length > 1 ? "s" : ""} dans ${radiusKm.toFixed(1)} km`}
                    {!searched && " — ajoutez un médicament pour la disponibilité"}
                    {searched && hiddenCount > 0 && ` · ${hiddenCount} sans aucun médicament masquée${hiddenCount > 1 ? "s" : ""}`}
                  </p>
                  {response?.source === "local" && (
                    <p className="mb-2 text-xs text-amber-600">
                      Zone hors couverture OSM — repli sur le jeu de démonstration (Paris).
                    </p>
                  )}
                  <ul className="space-y-2">
                    {listResults.map((r) => (
                      <PharmacyCard
                        key={r.id}
                        result={r}
                        selected={r.id === selectedId}
                        onSelect={() => setSelectedId(r.id)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>

        {/* Panneau droit : carte */}
        <div className="h-72 flex-1 md:h-auto">
          <MapWrapper
            center={center}
            userPosition={position ? [position.lat, position.lng] : null}
            radiusKm={radiusKm}
            items={mapItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </main>
  );
}

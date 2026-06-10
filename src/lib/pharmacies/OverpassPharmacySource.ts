import type { LatLng } from "@/lib/geo";
import type { Pharmacy, PharmacySource } from "./types";

/**
 * Source de pharmacies dynamique basée sur OpenStreetMap via l'API Overpass.
 *
 * Couvre toute la France (et au-delà), interrogeable par rayon autour d'un point
 * — c'est le « chargement par zone ». Gratuit, sans clé. La plupart des officines
 * françaises portent le tag `ref:FR:FINESS` (on l'utilise comme `id`, ce qui
 * garde la compatibilité avec le connecteur Smart Rx réel) et `opening_hours`.
 *
 * Les résultats sont mis en cache en mémoire (par zone arrondie + rayon) pour ne
 * pas solliciter Overpass à chaque cran du slider de rayon.
 */

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: Pharmacy[] }>();

/** Traduit les jours OSM (Mo, Tu…) en français pour l'affichage. */
function prettyHours(raw: string | undefined): string {
  if (!raw) return "Horaires non renseignés";
  const days: Record<string, string> = {
    Mo: "Lun",
    Tu: "Mar",
    We: "Mer",
    Th: "Jeu",
    Fr: "Ven",
    Sa: "Sam",
    Su: "Dim",
  };
  return raw.replace(/Mo|Tu|We|Th|Fr|Sa|Su/g, (d) => days[d] ?? d);
}

function buildAddress(t: Record<string, string>): string {
  const line = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const city = [t["addr:postcode"], t["addr:city"]].filter(Boolean).join(" ");
  const full = [line, city].filter(Boolean).join(", ");
  return full || "Adresse non renseignée (OSM)";
}

/** Mappe les éléments Overpass en pharmacies (fonction pure, testable). */
export function mapOverpassElements(elements: OverpassElement[]): Pharmacy[] {
  const byId = new Map<string, Pharmacy>();
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const t = el.tags ?? {};
    const finess = t["ref:FR:FINESS"];
    const id = finess ? finess : `osm:${el.type}/${el.id}`;
    if (byId.has(id)) continue; // dédoublonnage (FINESS partagé node/way)
    byId.set(id, {
      id,
      name: t.name || "Pharmacie",
      address: buildAddress(t),
      lat,
      lng,
      hours: prettyHours(t.opening_hours),
    });
  }
  return [...byId.values()];
}

export class OverpassPharmacySource implements PharmacySource {
  async findNear(center: LatLng, radiusKm: number): Promise<Pharmacy[]> {
    const meters = Math.round(radiusKm * 1000);
    // Clé de cache : zone arrondie (~110 m) + rayon, pour absorber les petits
    // déplacements et les crans du slider.
    const key = `${center.lat.toFixed(3)},${center.lng.toFixed(3)}@${meters}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }

    const around = `(around:${meters},${center.lat},${center.lng})`;
    const query =
      `[out:json][timeout:25];` +
      `(node["amenity"="pharmacy"]${around};way["amenity"="pharmacy"]${around};);` +
      `out center tags;`;

    const res = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Overpass refuse l'UA par défaut de certains clients (HTTP 406).
        "User-Agent": "EasyPharma-MVP/1.0 (demo)",
      },
      body: new URLSearchParams({ data: query }).toString(),
    });
    if (!res.ok) {
      throw new Error(`Overpass: HTTP ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { elements?: OverpassElement[] };
    const data = mapOverpassElements(json.elements ?? []);
    cache.set(key, { at: Date.now(), data });
    return data;
  }
}

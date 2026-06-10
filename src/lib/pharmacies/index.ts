import type { LatLng } from "@/lib/geo";
import type { Pharmacy } from "./types";
import { OverpassPharmacySource } from "./OverpassPharmacySource";
import { LocalPharmacySource } from "./LocalPharmacySource";

export type { Pharmacy, PharmacySource } from "./types";

export type LoadResult = {
  pharmacies: Pharmacy[];
  /** Source effectivement utilisée. */
  source: "overpass" | "local";
};

const overpass = new OverpassPharmacySource();
const local = new LocalPharmacySource();

/**
 * Charge les pharmacies proches de `center` dans `radiusKm`.
 *
 * Sélection via `PHARMACY_SOURCE` :
 *   - `overpass` (défaut) → OSM/Overpass (toute la France), avec REPLI auto sur le
 *     jeu local si Overpass échoue ou ne renvoie rien ;
 *   - `local` → uniquement le jeu FINESS Paris embarqué.
 *
 * Le repli garantit que la démo fonctionne même si Overpass est indisponible.
 */
export async function loadPharmaciesNear(
  center: LatLng,
  radiusKm: number,
): Promise<LoadResult> {
  const choice = (process.env.PHARMACY_SOURCE ?? "overpass").toLowerCase();

  if (choice === "local") {
    return { pharmacies: await local.findNear(center, radiusKm), source: "local" };
  }

  try {
    const pharmacies = await overpass.findNear(center, radiusKm);
    if (pharmacies.length > 0) return { pharmacies, source: "overpass" };
    // Zone sans donnée OSM exploitable → repli.
    return { pharmacies: await local.findNear(center, radiusKm), source: "local" };
  } catch (err) {
    console.error(
      `[pharmacies] Overpass indisponible, repli local: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return { pharmacies: await local.findNear(center, radiusKm), source: "local" };
  }
}

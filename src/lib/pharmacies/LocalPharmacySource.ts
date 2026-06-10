import { haversineKm, type LatLng } from "@/lib/geo";
import { PHARMACIES } from "@/data/pharmacies";
import type { Pharmacy, PharmacySource } from "./types";

/**
 * Source de repli : le jeu FINESS Paris embarqué, filtré par rayon.
 * Toujours disponible (hors-ligne), couverture limitée à la ville pilote.
 */
export class LocalPharmacySource implements PharmacySource {
  async findNear(center: LatLng, radiusKm: number): Promise<Pharmacy[]> {
    return PHARMACIES.filter(
      (p) => haversineKm(center, { lat: p.lat, lng: p.lng }) <= radiusKm,
    );
  }
}

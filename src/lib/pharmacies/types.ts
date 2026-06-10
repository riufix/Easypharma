import type { LatLng } from "@/lib/geo";

/** Une pharmacie géolocalisée (identité + position + horaires). */
export type Pharmacy = {
  /** Identifiant stable = n° FINESS si connu, sinon `osm:<type>/<id>`. */
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
};

/**
 * Source de pharmacies : charge les officines proches d'un point, dans un rayon.
 *
 * Permet de remplacer le jeu figé par un chargement DYNAMIQUE par zone (toute la
 * France), sans changer le code applicatif (route API / UI).
 */
export interface PharmacySource {
  findNear(center: LatLng, radiusKm: number): Promise<Pharmacy[]>;
}

/** Utilitaires géographiques : distance haversine + tri par proximité. */

export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Distance haversine en kilomètres entre deux points (lat/lng en degrés).
 * Précision suffisante pour trier des pharmacies par proximité.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Trie une liste d'éléments géolocalisés par distance croissante à `origin`,
 * et annote chaque élément de sa distance (`distanceKm`). Ne mute pas l'entrée.
 */
export function sortByDistance<T extends LatLng>(
  origin: LatLng,
  items: T[],
): Array<T & { distanceKm: number }> {
  return items
    .map((item) => ({ ...item, distanceKm: haversineKm(origin, item) }))
    .sort((x, y) => x.distanceKm - y.distanceKm);
}

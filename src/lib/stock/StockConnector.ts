/**
 * Contrat de lecture de stock multi-médicaments / multi-pharmacies (MVP).
 *
 * C'est le point dur du projet : lire l'état de stock réel des médicaments dans le
 * système d'une pharmacie via l'API d'un éditeur de LGO (Smart Rx, Winpharma…).
 *
 * Toute implémentation (mock ou réelle) vit CÔTÉ SERVEUR et respecte cette
 * interface, afin que le connecteur réel se branche ensuite SANS refactor de la
 * route API ni de l'UI. Le connecteur n'est jamais appelé depuis le client (pas
 * d'identifiants LGO dans le navigateur).
 */

/** Statut de disponibilité d'un médicament donné dans une pharmacie donnée. */
export type AvailabilityStatus = "available" | "unavailable" | "unknown";

/** Disponibilité d'un médicament (par nom) — oui/non, PAS de quantité exacte. */
export type ProductAvailability = {
  medication: string;
  status: AvailabilityStatus;
};

/** Résultat de stock pour une pharmacie : détail par produit + couverture. */
export type PharmacyResult = {
  pharmacyId: string;
  products: ProductAvailability[];
  /** Compteur de couverture, ex. { found: 3, total: 5 }. */
  coverage: { found: number; total: number };
  /** Fraîcheur de la donnée (ISO 8601). */
  updatedAt: string;
};

export interface StockConnector {
  /**
   * Renvoie, pour chaque pharmacie demandée, la disponibilité de chaque
   * médicament recherché + le compteur de couverture.
   *
   * Doit renvoyer un `PharmacyResult` par `pharmacyId` fourni (même ordre non
   * garanti — la route ré-associe par id). Ne lève pas pour un médicament
   * introuvable (statut `"unknown"`).
   */
  checkAvailability(
    medications: string[],
    pharmacyIds: string[],
  ): Promise<PharmacyResult[]>;
}

/** Calcule la couverture (nb de médicaments disponibles / total). */
export function computeCoverage(products: ProductAvailability[]): {
  found: number;
  total: number;
} {
  return {
    found: products.filter((p) => p.status === "available").length,
    total: products.length,
  };
}

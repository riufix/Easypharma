/**
 * Contrat unique de lecture de stock d'une pharmacie.
 *
 * C'est LE point dur du projet (cf. POC_Brief §1) : savoir lire l'état de stock
 * réel d'un médicament dans le système d'une pharmacie via l'API d'un éditeur de
 * LGO (Smart Rx, Winpharma…).
 *
 * Toute implémentation concrète (mock ou réelle) vit côté serveur et respecte
 * cette interface, de sorte que le connecteur Smart Rx réel se branche ensuite
 * SANS refactor (cf. POC_Brief §5).
 */

/** État de disponibilité d'un médicament dans une pharmacie donnée. */
export type AvailabilityStatus = "available" | "unavailable" | "unknown";

export type Availability = {
  status: AvailabilityStatus;
  /**
   * Réponse brute du connecteur sous-jacent, telle que renvoyée par l'API LGO.
   * Conservée pour le débogage / la traçabilité ; sa forme dépend du connecteur.
   * Côté Mock, elle imite la forme du contrat Smart Rx documenté dans le README.
   */
  raw?: unknown;
};

export interface StockConnector {
  /**
   * Renvoie l'état de disponibilité d'un médicament (recherché par nom) dans la
   * pharmacie identifiée par `pharmacyId`.
   *
   * Ne doit jamais lever d'exception pour un médicament introuvable : dans ce cas
   * le statut est `"unknown"`. Les erreurs réseau / d'authentification peuvent en
   * revanche remonter (l'appelant — la route API — les transforme en `"unknown"`).
   */
  checkAvailability(
    medicationName: string,
    pharmacyId: string,
  ): Promise<Availability>;
}

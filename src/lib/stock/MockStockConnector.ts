import {
  computeCoverage,
  type AvailabilityStatus,
  type PharmacyResult,
  type ProductAvailability,
  type StockConnector,
} from "./StockConnector";

/**
 * Connecteur de stock SIMULÉ (MVP).
 *
 * ⚠️ Données entièrement fictives — ne représentent PAS un stock réel. L'UI
 * affiche en permanence un bandeau « données de démonstration ».
 *
 * Disponibilité **pseudo-aléatoire mais STABLE** par (pharmacie, médicament) :
 * une même paire renvoie toujours le même statut (démo reproductible, et le
 * compteur de couverture reste cohérent d'une recherche à l'autre). Couvre les
 * 3 statuts ; certains tirages tombent volontairement en « non disponible » /
 * « inconnu » pour rendre le compteur X/Y parlant.
 *
 * La forme du retour (`PharmacyResult`) est identique à celle attendue du
 * connecteur réel → bascule mock → réel sans refactor.
 */

const SIMULATED_LATENCY_MS = 250;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Hash FNV-1a 32 bits → réel dans [0, 1). Déterministe. */
function hashUnit(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 pour rester non signé, puis normalisation sur 2^32.
  return (h >>> 0) / 0x100000000;
}

/** Statut stable pour un couple (médicament, pharmacie). */
function stableStatus(medication: string, pharmacyId: string): AvailabilityStatus {
  const h = hashUnit(`${normalize(medication)}@${pharmacyId}`);
  if (h < 0.15) return "unknown"; //      ~15 %
  if (h < 0.45) return "unavailable"; //  ~30 %
  return "available"; //                  ~55 %
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockStockConnector implements StockConnector {
  async checkAvailability(
    medications: string[],
    pharmacyIds: string[],
  ): Promise<PharmacyResult[]> {
    await delay(SIMULATED_LATENCY_MS); // imite la latence d'un appel LGO groupé

    // Marqueur de fraîcheur : "vérifié à l'instant" côté mock.
    const updatedAt = new Date().toISOString();

    return pharmacyIds.map((pharmacyId) => {
      const products: ProductAvailability[] = medications.map((medication) => ({
        medication,
        status: stableStatus(medication, pharmacyId),
      }));
      return {
        pharmacyId,
        products,
        coverage: computeCoverage(products),
        updatedAt,
      };
    });
  }
}

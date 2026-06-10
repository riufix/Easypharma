import type {
  Availability,
  AvailabilityStatus,
  StockConnector,
} from "./StockConnector";

/**
 * Connecteur de stock SIMULÉ.
 *
 * ⚠️ Données entièrement fictives — ne représentent PAS un stock réel
 * (cf. POC_Brief §5 : « Ne jamais présenter des données simulées comme réelles »).
 *
 * Objectif : prouver le flux de bout en bout et figer la FORME du contrat
 * attendu du connecteur réel. Le champ `raw` imite la forme — hypothétique —
 * de la réponse de la « Data API » Smart Rx documentée dans le README.
 *
 * Comportement déterministe : un même (médicament, pharmacie) renvoie toujours
 * le même statut, pour une démo reproductible.
 */

/** Forme — HYPOTHÉTIQUE — d'une réponse de stock de la Data API Smart Rx. */
type SmartRxStockResponseShape = {
  produit: { cip13: string; libelle: string } | null;
  stock: { quantite: number; seuilAlerte: number; disponible: boolean } | null;
  /** Marqueur explicite : ces données sont simulées. */
  _source: "mock";
};

/** Une entrée de catalogue produit (référentiel commun à toutes les officines). */
type Product = { cip13: string; libelle: string };

const CATALOG: Product[] = [
  { cip13: "3400930000001", libelle: "Doliprane 1000 mg" },
  { cip13: "3400930000002", libelle: "Amoxicilline 500 mg" },
  { cip13: "3400930000003", libelle: "Ventoline 100 µg" },
  { cip13: "3400930000004", libelle: "Spasfon 80 mg" },
  { cip13: "3400930000005", libelle: "Levothyrox 75 µg" },
];

/**
 * Stock simulé par pharmacie (clé = identifiant pharmacie = n° FINESS).
 * `quantite > 0` → disponible ; `0` → en rupture ; absent → produit non référencé.
 * Conçu pour qu'une recherche unique fasse apparaître les 3 statuts à la fois.
 */
const STOCK_BY_PHARMACY: Record<string, Record<string, number>> = {
  // PHARMACIE DE BABYLONE (75007)
  "750013443": {
    "3400930000001": 42, // Doliprane     → available
    "3400930000002": 0, //  Amoxicilline  → unavailable (rupture)
    "3400930000003": 7, //  Ventoline     → available
    "3400930000004": 15, // Spasfon       → available
  },
  // PHARMACIE DU METRO (75010)
  "750018475": {
    "3400930000001": 0, //  Doliprane     → unavailable (rupture)
    "3400930000002": 23, // Amoxicilline  → available
    "3400930000005": 4, //  Levothyrox    → available
  },
  // PHARMACIE EDGAR QUINET (75014)
  "750024085": {
    "3400930000001": 12, // Doliprane     → available
    "3400930000003": 0, //  Ventoline     → unavailable (rupture)
    "3400930000004": 30, // Spasfon       → available
  },
};

const SIMULATED_LATENCY_MS = 250;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents
    .toLowerCase()
    .trim();
}

/** Recherche « floue » d'un produit par nom (sous-chaîne, insensible casse/accents). */
function findProduct(medicationName: string): Product | undefined {
  const q = normalize(medicationName);
  if (!q) return undefined;
  return CATALOG.find((p) => normalize(p.libelle).includes(q));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockStockConnector implements StockConnector {
  async checkAvailability(
    medicationName: string,
    pharmacyId: string,
  ): Promise<Availability> {
    await delay(SIMULATED_LATENCY_MS); // imite la latence réseau d'un appel LGO

    const product = findProduct(medicationName);

    // Produit absent du référentiel → on ne sait pas conclure.
    if (!product) {
      const raw: SmartRxStockResponseShape = {
        produit: null,
        stock: null,
        _source: "mock",
      };
      return { status: "unknown", raw };
    }

    const pharmacyStock = STOCK_BY_PHARMACY[pharmacyId];
    const quantite = pharmacyStock?.[product.cip13];

    // Produit référencé mais pharmacie inconnue / produit non géré par l'officine.
    if (quantite === undefined) {
      const raw: SmartRxStockResponseShape = {
        produit: { cip13: product.cip13, libelle: product.libelle },
        stock: null,
        _source: "mock",
      };
      return { status: "unknown", raw };
    }

    const disponible = quantite > 0;
    const status: AvailabilityStatus = disponible ? "available" : "unavailable";
    const raw: SmartRxStockResponseShape = {
      produit: { cip13: product.cip13, libelle: product.libelle },
      stock: { quantite, seuilAlerte: 5, disponible },
      _source: "mock",
    };
    return { status, raw };
  }
}

import {
  computeCoverage,
  type AvailabilityStatus,
  type PharmacyResult,
  type ProductAvailability,
  type StockConnector,
} from "./StockConnector";

/**
 * Connecteur de stock RÉEL vers la « Data API » Smart Rx (groupe Cegedim).
 *
 * ✅ Contrat aligné sur le Swagger PUBLIC réel (vérifié le 2026-06-10) :
 *    UI   : https://www.pharmanuage.fr/data-api/swagger-ui/
 *    Spec : https://www.pharmanuage.fr/data-api/v3/api-docs   (DATA-API v2.2.8)
 *
 * Endpoints, paramètres et noms de champs proviennent de la spec (PAS d'invention).
 * Reste NON TESTÉ faute d'accès (identifiants + autorisation d'une officine). Tant
 * que les identifiants manquent, `checkAvailability` lève une erreur explicite.
 *
 * Bascule mock → réel : `STOCK_CONNECTOR=smartrx`. La forme du retour
 * (`PharmacyResult[]`) est identique au MockStockConnector → aucun refactor de la
 * route API ni de l'UI.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Contrat réel :
 *   Auth :  POST {base}/data-api/v2/auth  body { username, password } → { token } (24 h)
 *   Stock : GET {base}/data-api/v2/{finess}/products?cip={cip}&active=true
 *           header Authorization: Bearer {token}
 *           → ProductDto : { stockQuantity, isManagedStock, productStatus,
 *                            description, officialProductCode, ... }
 *   {finess} = pharmacyId. Accès « officine par officine, à la demande du pharmacien ».
 * ──────────────────────────────────────────────────────────────────────────
 */

type ProductDto = {
  description?: string;
  officialProductCode?: string;
  isManagedStock?: boolean;
  productStatus?: string;
  stockQuantity?: number;
};

/** Spec déclare ProductDto au singulier mais expose page/size → on tolère */
/** tableau / page Spring { content:[…] } / objet seul. */
function toProductArray(body: unknown): ProductDto[] {
  if (Array.isArray(body)) return body as ProductDto[];
  if (body && typeof body === "object") {
    const maybe = body as { content?: unknown };
    if (Array.isArray(maybe.content)) return maybe.content as ProductDto[];
    return [body as ProductDto];
  }
  return [];
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export class SmartRxStockConnector implements StockConnector {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.baseUrl = (process.env.SMARTRX_BASE_URL ?? "https://www.pharmanuage.fr").replace(/\/$/, "");
    this.username = process.env.SMARTRX_USERNAME ?? "";
    this.password = process.env.SMARTRX_PASSWORD ?? "";
  }

  async checkAvailability(
    medications: string[],
    pharmacyIds: string[],
  ): Promise<PharmacyResult[]> {
    if (!this.username || !this.password) {
      throw new Error(
        "SmartRxStockConnector : identifiants manquants. " +
          "Renseignez SMARTRX_USERNAME et SMARTRX_PASSWORD (et au besoin SMARTRX_BASE_URL), " +
          "obtenus via le partenariat Smart Rx + l'autorisation d'une officine. " +
          "Sans accès, utilisez STOCK_CONNECTOR=mock.",
      );
    }

    const token = await this.getToken();
    const updatedAt = new Date().toISOString();

    return Promise.all(
      pharmacyIds.map(async (pharmacyId) => {
        const products: ProductAvailability[] = await Promise.all(
          medications.map(async (medication) => ({
            medication,
            status: await this.statusFor(medication, pharmacyId, token),
          })),
        );
        return {
          pharmacyId,
          products,
          coverage: computeCoverage(products),
          updatedAt,
        };
      }),
    );
  }

  private async statusFor(
    medication: string,
    finess: string,
    token: string,
  ): Promise<AvailabilityStatus> {
    const product = await this.findProduct(medication, finess, token);
    if (!product) return "unknown";
    if (product.isManagedStock === false) return "unknown";
    if (typeof product.stockQuantity !== "number") return "unknown";
    return product.stockQuantity > 0 ? "available" : "unavailable";
  }

  /** Token d'auth avec cache 24 h. */
  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken.token;
    }
    const res = await fetch(`${this.baseUrl}/data-api/v2/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });
    if (!res.ok) throw new Error(`Smart Rx auth: HTTP ${res.status} ${res.statusText}`);
    const json = (await res.json()) as { token?: string };
    if (!json?.token) throw new Error("Smart Rx auth: réponse sans champ 'token'.");
    this.cachedToken = { token: json.token, expiresAt: now + TOKEN_TTL_MS };
    return json.token;
  }

  /**
   * Recherche le produit correspondant au médicament.
   *
   * ⚠️ La Data API ne filtre PAS par libellé (seulement `cip`/`ids`) :
   *   - saisie = code CIP/EAN → requête directe `?cip=` ;
   *   - sinon → pagination du catalogue + filtre local sur `description` (repli
   *     autonome ; en prod, préférer une résolution nom → CIP via la BDPM).
   */
  private async findProduct(
    medication: string,
    finess: string,
    token: string,
  ): Promise<ProductDto | null> {
    const q = medication.trim();
    if (/^\d{7,13}$/.test(q)) {
      const products = await this.getProducts(finess, token, { cip: q, active: "true", size: "1" });
      return products[0] ?? null;
    }
    const target = normalize(q);
    const MAX_PAGES = 50;
    for (let page = 0; page < MAX_PAGES; page++) {
      const products = await this.getProducts(finess, token, {
        active: "true",
        size: "100",
        page: String(page),
      });
      if (products.length === 0) break;
      const match = products.find((p) => normalize(p.description ?? "").includes(target));
      if (match) return match;
      if (products.length < 100) break;
    }
    return null;
  }

  private async getProducts(
    finess: string,
    token: string,
    params: Record<string, string>,
  ): Promise<ProductDto[]> {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(
      `${this.baseUrl}/data-api/v2/${encodeURIComponent(finess)}/products?${qs}`,
      {
        headers: {
          // ⚠️ À CONFIRMER : la *description* de la spec impose
          // `Authorization: Bearer {token}`, mais le securityScheme OpenAPI
          // déclare un apiKey nommé `TOKEN`. Si 401, basculer sur : TOKEN: token
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) throw new Error(`Smart Rx products: HTTP ${res.status} ${res.statusText}`);
    return toProductArray(await res.json());
  }
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

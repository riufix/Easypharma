import type { Availability, AvailabilityStatus, StockConnector } from "./StockConnector";

/**
 * Connecteur de stock RÉEL vers la « Data API » Smart Rx (groupe Cegedim).
 *
 * ✅ Contrat aligné sur le Swagger PUBLIC réel (vérifié le 2026-06-10) :
 *    UI   : https://www.pharmanuage.fr/data-api/swagger-ui/
 *    Spec : https://www.pharmanuage.fr/data-api/v3/api-docs   (DATA-API v2.2.8)
 *
 * Le code ci-dessous N'EST PAS hypothétique : endpoints, paramètres et noms de
 * champs proviennent de la spec. Il reste NON TESTÉ faute d'accès (il faut des
 * identifiants + l'autorisation d'une officine). Deux points sont AMBIGUS dans la
 * spec et balisés `⚠️ À CONFIRMER` ci-dessous ; tout le reste est conforme.
 *
 * Bascule mock → réel : `STOCK_CONNECTOR=smartrx`. La forme du retour
 * (`Availability`) est identique au MockStockConnector → aucun refactor de la
 * route API ni de l'UI (cf. POC_Brief §5).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Contrat réel utilisé :
 *
 *   Auth :  POST {base}/data-api/v2/auth
 *           body JSON  { "username": "...", "password": "..." }
 *           → 200/201  { "token": "..." }   (TokenDto ; valable 24 h)
 *
 *   Stock : GET {base}/data-api/v2/{finess}/products?cip={cip13}&active=true
 *           header  Authorization: Bearer {token}
 *           → 200    ProductDto (ou collection de ProductDto, cf. pagination)
 *           champs utiles : stockQuantity, isManagedStock, productStatus,
 *                           description (libellé), officialProductCode (CIP/EAN).
 *
 *   {finess} = identifiant pharmacie (= pharmacyId, n° FINESS établissement).
 *   Accès ouvert « officine par officine, à la demande du pharmacien ».
 * ──────────────────────────────────────────────────────────────────────────
 */

/** Sous-ensemble du ProductDto réel (champs effectivement exploités). */
type ProductDto = {
  productId?: number;
  description?: string; // libellé du produit
  officialProductCode?: string; // CIP7 / CIP13 / EAN13 (issu de la BCB)
  ean13?: string;
  isManagedStock?: boolean; // produit géré en stock ou non
  productStatus?: string; // ACTIVE | DELETED
  stockQuantity?: number; // quantité en stock
};

/** La spec déclare ProductDto au singulier mais expose page/size : on tolère */
/** une réponse en tableau, en page Spring { content: [...] }, ou en objet seul. */
function toProductArray(body: unknown): ProductDto[] {
  if (Array.isArray(body)) return body as ProductDto[];
  if (body && typeof body === "object") {
    const maybe = body as { content?: unknown };
    if (Array.isArray(maybe.content)) return maybe.content as ProductDto[];
    return [body as ProductDto];
  }
  return [];
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // token valable 24 h (cf. spec)

export class SmartRxStockConnector implements StockConnector {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    // Le serveur déclaré dans la spec est https://www.pharmanuage.fr(:443).
    this.baseUrl = (process.env.SMARTRX_BASE_URL ?? "https://www.pharmanuage.fr").replace(/\/$/, "");
    this.username = process.env.SMARTRX_USERNAME ?? "";
    this.password = process.env.SMARTRX_PASSWORD ?? "";
  }

  async checkAvailability(
    medicationName: string,
    pharmacyId: string,
  ): Promise<Availability> {
    if (!this.username || !this.password) {
      throw new Error(
        "SmartRxStockConnector : identifiants manquants. " +
          "Renseignez SMARTRX_USERNAME et SMARTRX_PASSWORD (et au besoin SMARTRX_BASE_URL), " +
          "obtenus via le partenariat Smart Rx + l'autorisation d'une officine. " +
          "Sans accès, utilisez STOCK_CONNECTOR=mock.",
      );
    }

    const token = await this.getToken();
    const product = await this.findProduct(medicationName, pharmacyId, token);

    if (!product) {
      // Produit introuvable dans le catalogue de cette officine.
      return { status: "unknown", raw: null };
    }

    return { status: this.mapStatus(product), raw: product };
  }

  /** Conversion ProductDto → statut du contrat commun. */
  private mapStatus(p: ProductDto): AvailabilityStatus {
    if (p.isManagedStock === false) return "unknown"; // stock non suivi → indéterminé
    if (typeof p.stockQuantity !== "number") return "unknown";
    return p.stockQuantity > 0 ? "available" : "unavailable";
  }

  /** Authentification (POST /auth) avec cache 24 h du token. */
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
    if (!res.ok) {
      throw new Error(`Smart Rx auth: HTTP ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { token?: string };
    if (!json?.token) {
      throw new Error("Smart Rx auth: réponse sans champ 'token'.");
    }
    this.cachedToken = { token: json.token, expiresAt: now + TOKEN_TTL_MS };
    return json.token;
  }

  /**
   * Récupère le produit correspondant au médicament recherché.
   *
   * ⚠️ La Data API ne propose PAS de recherche par libellé : les filtres sont
   * `cip` (code CIP) ou `ids`. Deux cas :
   *   1) la saisie est un code CIP/EAN (chiffres) → requête directe `?cip=`.
   *   2) sinon → on parcourt le catalogue de l'officine et on filtre sur
   *      `description` côté connecteur (fallback autonome, sans référentiel tiers).
   *
   * En production, préférer le cas (1) en résolvant nom → CIP via un référentiel
   * (BDPM / base CIP) afin d'éviter de paginer le catalogue à chaque requête.
   */
  private async findProduct(
    medicationName: string,
    finess: string,
    token: string,
  ): Promise<ProductDto | null> {
    const query = medicationName.trim();
    const looksLikeCip = /^\d{7,13}$/.test(query);

    if (looksLikeCip) {
      const products = await this.getProducts(finess, token, {
        cip: query,
        active: "true",
        size: "1",
      });
      return products[0] ?? null;
    }

    // Fallback : recherche par libellé en paginant le catalogue de l'officine.
    const target = normalize(query);
    const MAX_PAGES = 50; // garde-fou (50 × 100 = 5000 références)
    for (let page = 0; page < MAX_PAGES; page++) {
      const products = await this.getProducts(finess, token, {
        active: "true",
        size: "100",
        page: String(page),
      });
      if (products.length === 0) break;
      const match = products.find((p) => normalize(p.description ?? "").includes(target));
      if (match) return match;
      if (products.length < 100) break; // dernière page
    }
    return null;
  }

  /** GET /data-api/v2/{finess}/products avec le token. */
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
          // ⚠️ À CONFIRMER : la *description* de la spec impose ce header
          // (Authorization: Bearer {token}). Mais le `securityScheme` OpenAPI
          // déclare un apiKey nommé `TOKEN`. Si le Bearer est rejeté (401),
          // basculer sur :  TOKEN: token
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) {
      throw new Error(`Smart Rx products: HTTP ${res.status} ${res.statusText}`);
    }
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

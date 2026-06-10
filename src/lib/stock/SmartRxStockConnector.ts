import type { Availability, StockConnector } from "./StockConnector";

/**
 * Connecteur de stock RÉEL vers la « Data API » Smart Rx (groupe Cegedim).
 *
 * ⚠️ SQUELETTE NON FONCTIONNEL. Le contrat ci-dessous (URLs, auth, schéma) est
 * HYPOTHÉTIQUE : la documentation Smart Rx (https://developer.pharmanuage.fr/)
 * n'est PAS accessible sans compte partenaire — l'endpoint Data API renvoie 403
 * (vérifié le 2026-06-10). Voir README §« Recherche d'API ».
 *
 * Tant que les accès partenaire manquent, `checkAvailability` lève une erreur
 * explicite. La forme du retour (`Availability`) est néanmoins identique à celle
 * du MockStockConnector : on bascule mock → réel via STOCK_CONNECTOR=smartrx,
 * SANS refactor de la route API ni de l'UI (cf. POC_Brief §5).
 *
 * --------------------------------------------------------------------------
 * Contrat HYPOTHÉTIQUE à confirmer auprès de Smart Rx :
 *
 *   Auth (OAuth2 client_credentials, à confirmer) :
 *     POST {SMARTRX_BASE_URL}/oauth/token
 *       grant_type=client_credentials
 *       client_id={SMARTRX_CLIENT_ID}
 *       client_secret={SMARTRX_CLIENT_SECRET}
 *     → { access_token, expires_in, token_type: "Bearer" }
 *
 *   Lecture de stock (Data API) :
 *     GET {SMARTRX_BASE_URL}/dataapi/v1/pharmacies/{pharmacyId}/stock?libelle={medicationName}
 *       Authorization: Bearer {access_token}
 *     → { produit: { cip13, libelle }, stock: { quantite, disponible } }
 *
 *   Note d'accès : l'API Smart Rx n'est ouverte « officine par officine, qu'à la
 *   demande du pharmacien ». `pharmacyId` doit correspondre à une officine ayant
 *   autorisé l'accès partenaire.
 * --------------------------------------------------------------------------
 */
export class SmartRxStockConnector implements StockConnector {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    this.baseUrl = process.env.SMARTRX_BASE_URL ?? "";
    this.clientId = process.env.SMARTRX_CLIENT_ID ?? "";
    this.clientSecret = process.env.SMARTRX_CLIENT_SECRET ?? "";
  }

  async checkAvailability(
    medicationName: string,
    pharmacyId: string,
  ): Promise<Availability> {
    // Paramètres référencés pour documenter la signature du futur appel réel
    // (cf. TODO plus bas) ; non utilisés tant que le connecteur est un squelette.
    void medicationName;
    void pharmacyId;

    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      throw new Error(
        "SmartRxStockConnector : accès partenaire manquants. " +
          "Renseignez SMARTRX_BASE_URL, SMARTRX_CLIENT_ID, SMARTRX_CLIENT_SECRET " +
          "puis implémentez l'authentification et l'appel ci-dessous. " +
          "Tant que le partenariat Smart Rx n'est pas obtenu, utilisez STOCK_CONNECTOR=mock.",
      );
    }

    // TODO(partenariat Smart Rx) : implémenter une fois les accès obtenus.
    //
    // 1) Authentification — obtenir/rafraîchir un access_token (OAuth2) :
    //    const token = await this.getAccessToken();
    //
    // 2) Appel Data API — lire le stock de la pharmacie :
    //    const res = await fetch(
    //      `${this.baseUrl}/dataapi/v1/pharmacies/${encodeURIComponent(pharmacyId)}` +
    //        `/stock?libelle=${encodeURIComponent(medicationName)}`,
    //      { headers: { Authorization: `Bearer ${token}` } },
    //    );
    //    if (!res.ok) throw new Error(`Smart Rx Data API: HTTP ${res.status}`);
    //    const raw = await res.json();
    //
    // 3) Mapping vers le contrat commun `Availability` :
    //    const status = raw?.stock?.disponible ? "available" : "unavailable";
    //    return { status, raw };
    throw new Error(
      "SmartRxStockConnector.checkAvailability : non implémenté (squelette). " +
        "Voir les TODO et le contrat hypothétique dans ce fichier.",
    );
  }

  // private async getAccessToken(): Promise<string> {
  //   const res = await fetch(`${this.baseUrl}/oauth/token`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //     body: new URLSearchParams({
  //       grant_type: "client_credentials",
  //       client_id: this.clientId,
  //       client_secret: this.clientSecret,
  //     }),
  //   });
  //   if (!res.ok) throw new Error(`Smart Rx OAuth: HTTP ${res.status}`);
  //   const json = (await res.json()) as { access_token: string };
  //   return json.access_token;
  // }
}

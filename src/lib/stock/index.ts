import type { StockConnector } from "./StockConnector";
import { MockStockConnector } from "./MockStockConnector";
import { SmartRxStockConnector } from "./SmartRxStockConnector";

export type {
  AvailabilityStatus,
  ProductAvailability,
  PharmacyResult,
  StockConnector,
} from "./StockConnector";

/**
 * Sélection du connecteur de stock via `STOCK_CONNECTOR` (`mock` par défaut).
 *
 *   STOCK_CONNECTOR=mock     → MockStockConnector (données simulées)   [défaut]
 *   STOCK_CONNECTOR=smartrx  → SmartRxStockConnector (réel, squelette)
 *
 * Instancié côté serveur uniquement (route API). Seul endroit à changer pour
 * passer du mock au réel — l'UI ne dépend que de l'interface `StockConnector`.
 */
export function getStockConnector(): StockConnector {
  const choice = (process.env.STOCK_CONNECTOR ?? "mock").toLowerCase();
  switch (choice) {
    case "smartrx":
      return new SmartRxStockConnector();
    case "mock":
      return new MockStockConnector();
    default:
      console.warn(`[stock] STOCK_CONNECTOR="${choice}" inconnu — repli sur "mock".`);
      return new MockStockConnector();
  }
}

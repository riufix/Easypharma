import type { StockConnector } from "./StockConnector";
import { MockStockConnector } from "./MockStockConnector";
import { SmartRxStockConnector } from "./SmartRxStockConnector";

export type { Availability, AvailabilityStatus, StockConnector } from "./StockConnector";

/**
 * Sélection du connecteur de stock via la variable d'environnement
 * `STOCK_CONNECTOR` (`mock` par défaut).
 *
 *   STOCK_CONNECTOR=mock     → MockStockConnector (données simulées)   [défaut]
 *   STOCK_CONNECTOR=smartrx  → SmartRxStockConnector (réel, squelette)
 *
 * Le connecteur est instancié côté serveur uniquement (importé par la route
 * API). C'est le seul endroit à changer pour passer du mock au réel — l'UI et
 * la route ne dépendent que de l'interface `StockConnector`.
 */
export function getStockConnector(): StockConnector {
  const choice = (process.env.STOCK_CONNECTOR ?? "mock").toLowerCase();

  switch (choice) {
    case "smartrx":
      return new SmartRxStockConnector();
    case "mock":
      return new MockStockConnector();
    default:
      console.warn(
        `[stock] STOCK_CONNECTOR="${choice}" inconnu — repli sur "mock".`,
      );
      return new MockStockConnector();
  }
}

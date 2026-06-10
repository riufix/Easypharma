# Compte rendu — POC EasyPharma (lecture de stock)

**Date :** 2026-06-10 · **Stack :** Next.js 16 (App Router, TS) + Tailwind 4 + Leaflet · **Tests :** Vitest

## Ce qui est prouvé

- **Le flux de bout en bout fonctionne.** Nom de médicament saisi → route API
  serveur → connecteur de stock → réponse par pharmacie → **carte (marqueurs
  colorés) + liste**. Vérifié à l'exécution (`Doliprane`, `Ventoline`, médicament
  hors catalogue, requête vide → HTTP 400).
- **Les 3 statuts sont gérés** : `available` / `unavailable` / `unknown`, couverts
  par 8 tests Vitest qui passent (`npm test`). La recherche `Ventoline` montre les
  3 statuts simultanément sur la carte.
- **L'architecture rend l'intégration réelle branchable sans refactor.** Tout passe
  par l'interface `StockConnector`. Le basculement mock → réel se fait par la seule
  variable `STOCK_CONNECTOR` ; vérifié : `STOCK_CONNECTOR=smartrx` (sans accès) lève
  une erreur explicite, dégradée proprement en `unknown` par la route — l'UI tient.
- **Le secret reste serveur.** Le connecteur (et d'éventuels identifiants LGO) est
  instancié uniquement dans la route API ; rien n'est exposé au client.
- **Données pharmacies réelles** (FINESS) ; **données de stock simulées** et
  clairement étiquetées comme telles partout (UI, code, README).
- **Build de production OK** (`npm run build`, typecheck inclus). Gotcha Leaflet +
  Next géré (dynamic import `ssr:false` dans un Client Component).

## Ce qui reste à valider

- **L'accès réel à l'API Smart Rx (point dur restant).** La doc Data API est gated
  (HTTP 403 sans compte partenaire) ; l'accès est ouvert « officine par officine, à
  la demande du pharmacien ». **Action : contact commercial / partenariat Smart Rx**
  pour obtenir identifiants + doc. C'est un **POC d'accès**, à régler hors code.
- **Le contrat Smart Rx est HYPOTHÉTIQUE.** Endpoint, schéma de réponse et flux
  d'auth (OAuth2 supposé) sont à **confirmer** sur la doc partenaire avant d'écrire
  l'appel réel dans `SmartRxStockConnector` (TODO balisés).
- **Forme exacte de la recherche produit** : par `cip13` (code CIP) plutôt que par
  libellé ? À trancher selon l'API réelle ; un mapping nom → CIP côté connecteur
  sera probablement nécessaire.
- **Fiabilité / fraîcheur du stock** côté LGO (temps réel vs différé), quotas et
  latence de l'API réelle — non mesurables sans accès.

## Verdict

Le seul vrai inconnu — **savoir lire un état de stock par pharmacie via un
connecteur LGO** — est levé côté logiciel : le flux, le contrat et le point
d'intégration sont prouvés et prêts. **Reste l'obtention des accès partenaire**, qui
relève du commercial et non de la technique.

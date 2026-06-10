# EasyPharma — MVP

Aide un patient à trouver une **pharmacie proche qui a son/ses médicament(s) en
stock**. MVP web (vrai produit, pas un POC jetable), construit dans la continuité
du POC de lecture de stock.

> ⚠️ **La donnée de stock est SIMULÉE (mockée).** L'accès aux vraies API des
> logiciels de pharmacie (LGO) n'est pas encore décroché. Un **bandeau permanent**
> le rappelle dans l'UI. La **localisation des pharmacies** (FINESS) et la
> **géolocalisation** sont, elles, **réelles**.

**Stack :** Next.js 16 (App Router, TypeScript) · Tailwind CSS · Leaflet (react-leaflet).

---

## Démarrer

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # tests Vitest (couverture, distance haversine, mock)
npm run build    # build de production (typecheck inclus)
```

**Parcours :** ajouter un ou plusieurs médicaments (chips) → « Utiliser ma position »
(ou saisir une adresse) → régler le **rayon** → la carte et la liste affichent les
pharmacies proches, triées par distance, avec leur couverture.

---

## Les 3 fonctionnalités

1. **Recherche textuelle multi-médicaments** — par nom, plusieurs médicaments sous
   forme de « chips » (comme les lignes d'une ordonnance), avec **autocomplétion sur
   le référentiel réel BDPM** (la saisie libre reste possible). *(Le référentiel +
   l'autocomplétion ont été ajoutés à la demande, au-delà du périmètre initial.)*
2. **Pharmacies proches** disposant du/des produit(s) — **liste + carte Leaflet
   synchronisées**, **triées par distance** (haversine), filtrées par un **rayon
   réglable** (0,5–10 km).
3. **Compteur de couverture** — pour chaque pharmacie, **combien des médicaments sont
   disponibles** (ex. 3/5) + le **détail dispo/non/inconnu par produit**. Pas de
   quantité exacte, juste oui/non.

Plus : fiche pharmacie (nom, adresse, distance, horaires, **bouton itinéraire**),
**indicateur de fraîcheur** du stock, **bandeau « démonstration »**, et les états
(aucune position, aucun résultat, géoloc refusée, chargement, erreur).

---

## Architecture du stock (mock, branché côté serveur)

Le stock passe par une abstraction `StockConnector`, **toujours côté serveur**
(route API), pour que la vraie API LGO se branche plus tard **sans rien refactorer**
et que d'éventuels identifiants ne soient jamais exposés au navigateur.

```
src/
├─ lib/
│  ├─ stock/
│  │  ├─ StockConnector.ts        Interface + types (ProductAvailability, PharmacyResult) + computeCoverage
│  │  ├─ MockStockConnector.ts    Mock : dispo pseudo-aléatoire STABLE par (pharmacie, médicament), latence, 3 statuts
│  │  ├─ SmartRxStockConnector.ts Connecteur réel Smart Rx (Data API v2) — écrit d'après la vraie spec, non testé
│  │  └─ index.ts                 getStockConnector() — choix via STOCK_CONNECTOR (mock par défaut)
│  ├─ pharmacies/
│  │  ├─ types.ts                 Type Pharmacy + interface PharmacySource
│  │  ├─ OverpassPharmacySource.ts Chargement dynamique OSM/Overpass (France, par rayon, cache)
│  │  ├─ LocalPharmacySource.ts   Repli : jeu FINESS Paris filtré par rayon
│  │  └─ index.ts                 loadPharmaciesNear() — Overpass + repli auto local
│  ├─ geo.ts                      Haversine + tri par distance
│  ├─ coverage.ts                 Niveau de couverture → couleur des marqueurs
│  └─ medications.ts              Recherche dans le référentiel BDPM (autocomplétion)
├─ data/
│  ├─ pharmacies.paris.json       Jeu FINESS Paris (repli hors-ligne)
│  ├─ pharmacies.ts               Chargement du jeu de repli
│  └─ medications.json            Noms de médicaments réels (BDPM, ~15 600)
├─ app/
│  ├─ api/search/route.ts         Route serveur : médicaments + position + rayon → pharmacies triées + couverture
│  ├─ api/medications/route.ts    Route serveur : autocomplétion de noms (référentiel BDPM)
│  └─ page.tsx                    Page unique (orchestration)
└─ components/                    SearchBar, PositionControl, RadiusControl, Map, MapWrapper, PharmacyCard, DemoBanner
```

Contrat :

```ts
type ProductAvailability = { medication: string; status: 'available' | 'unavailable' | 'unknown' };
type PharmacyResult = {
  pharmacyId: string;
  products: ProductAvailability[];
  coverage: { found: number; total: number };  // ex. 3 / 5
  updatedAt: string;                            // fraîcheur
};
interface StockConnector {
  checkAvailability(medications: string[], pharmacyIds: string[]): Promise<PharmacyResult[]>;
}
```

### Comment marche le mock

`MockStockConnector` génère une disponibilité **pseudo-aléatoire mais stable** :
un hash déterministe de `(médicament, pharmacie)` donne toujours le même statut
(~55 % disponible, ~30 % non, ~15 % inconnu). Le compteur de couverture reste donc
cohérent d'une recherche à l'autre, et les 3 statuts sont représentés.

### Comment brancher un vrai connecteur LGO

1. Obtenir les accès Smart Rx (`SMARTRX_USERNAME`, `SMARTRX_PASSWORD`, au besoin
   `SMARTRX_BASE_URL`) — voir [`.env.example`](./.env.example). L'API est ouverte
   « officine par officine, à la demande du pharmacien ».
2. Lancer avec `STOCK_CONNECTOR=smartrx`. Le connecteur (auth + appel `products` +
   mapping) est **déjà écrit d'après la spec OpenAPI réelle** de la Data API
   (`https://www.pharmanuage.fr/data-api/v3/api-docs`, DATA-API v2.2.8) :
   - Auth : `POST /data-api/v2/auth` `{ username, password }` → `{ token }` (24 h) ;
   - Stock : `GET /data-api/v2/{finess}/products?cip=…` → champ `stockQuantity` ;
   - `{finess}` = `pharmacyId`.
3. Lever les 2 ambiguïtés de la spec balisées `⚠️ À CONFIRMER` dans
   [`SmartRxStockConnector.ts`](./src/lib/stock/SmartRxStockConnector.ts) (forme du
   header d'auth ; forme exacte de la réponse `products`).

Tant que les identifiants manquent, `STOCK_CONNECTOR=smartrx` lève une erreur
explicite ; la route la dégrade en statuts « inconnu » + message (l'UI tient).
**Aucun endpoint LGO n'est inventé.**

---

## Sources de données

### Pharmacies — chargement dynamique par zone

Les pharmacies sont chargées **dynamiquement autour de la position, dans le rayon
choisi** (pas de jeu figé). Abstraction `PharmacySource` (`src/lib/pharmacies/`),
sélection via `PHARMACY_SOURCE` :

- **`overpass` (défaut)** — **OpenStreetMap** via l'API **Overpass**, gratuite et
  sans clé, **couvre toute la France** et est requêtable par rayon. La plupart des
  officines portent `ref:FR:FINESS` (utilisé comme `id` → compatible avec le
  connecteur Smart Rx réel) et `opening_hours` (**horaires réels** quand présents).
  Adresses OSM parfois incomplètes → repli « Adresse non renseignée (OSM) »
  (l'itinéraire reste fiable, basé sur les coordonnées). Résultats mis en cache en
  mémoire (par zone + rayon) ; liste plafonnée à 150 pharmacies (les plus proches,
  signalé dans l'UI).
- **`local`** (repli automatique si Overpass échoue/ne renvoie rien) — jeu
  **FINESS Paris** embarqué (`src/data/pharmacies.paris.json`, dataset open data
  « carte-des-pharmacies-de-paris », source FINESS :
  <https://data.iledefrance.fr/explore/dataset/carte-des-pharmacies-de-paris/>).
  `name`/`address`/`id`/`lat`/`lng` **réels** ; ⚠️ `hours` **ILLUSTRATIVES** (FINESS
  ne contient pas les horaires). Couverture limitée à Paris.

### Autres sources

- **Noms de médicaments** — **BDPM** (Base de Données Publique des Médicaments),
  fichier `CIS_bdpm.txt`, service public :
  <https://base-donnees-publique.medicaments.gouv.fr/>. ~15 600 dénominations
  réelles, embarquées dans `src/data/medications.json` et servies par
  `/api/medications` (autocomplétion). Réutilisable telles quelles pour brancher le
  vrai stock (recherche par nom/CIP).
- **Géocodage d'adresse** — API Adresse (**BAN**), gratuite et publique :
  <https://api-adresse.data.gouv.fr/search/> (appelée pour le repli « saisir une
  adresse »).
- **Géolocalisation** — `navigator.geolocation` du navigateur.
- **Fonds de carte** — tuiles OpenStreetMap.

---

## Périmètre

**DANS le MVP :** recherche multi-médicaments par nom · géoloc + repli adresse (BAN)
· tri par distance + rayon réglable · carte Leaflet + liste synchronisées · fiche
pharmacie + itinéraire · compteur de couverture X/Y + détail par produit · indicateur
de fraîcheur + bandeau démo · états (vide / aucun résultat / géoloc refusée /
chargement / erreur).

**HORS MVP (V1/V2) :** compte / connexion · scan & import d'ordonnance · commande en
ligne, click & collect, équivalences · back-office
pharmacien · **vraie** connexion LGO (mockée ici) · hébergement HDS · conformité DSFR
complète. Accessibilité de base seulement (HTML sémantique, labels, contraste,
navigation clavier).

---

## Tests

`npm test` (Vitest) couvre la logique métier :

- **couverture X/Y** (`computeCoverage`) ;
- **tri par distance** (haversine + `sortByDistance`) ;
- **`MockStockConnector`** : un résultat par pharmacie, stabilité, 3 statuts,
  couverture, cas 0 médicament ;
- **mapping Overpass** (`mapOverpassElements`) : FINESS prioritaire, `center` des
  ways, dédoublonnage, valeurs par défaut ;
- **autocomplétion BDPM** (`searchMedications`) : priorité au préfixe, insensible
  aux accents/casse, limite respectée.

# Prompt Claude Code — MVP EasyPharma
*À donner à Claude Code. À lire en entier avant de coder.*

## 0. Contexte

EasyPharma aide un patient à trouver une **pharmacie proche qui a son/ses médicament(s) en stock**. On construit ici le **MVP** (vrai produit, pas un POC jetable), en **web d'abord**.

- **Stack imposée : Next.js (App Router, TypeScript) + Tailwind CSS + Leaflet (react-leaflet).**
- **La donnée de stock est délibérément MOCKÉE** (l'accès aux vraies API des logiciels pharmacie n'est pas encore décroché). Elle est isolée derrière une abstraction `StockConnector`, **côté serveur**, pour que la vraie API se branche plus tard **sans rien refactorer**. Voir §4.
- La **localisation des pharmacies** et la **géolocalisation** sont, elles, **réelles** (open data + navigateur).
- Projet financé par l'État, reprise non actée : **DSFR non requis** à ce stade. Garder une UI propre et raisonnablement accessible (HTML sémantique, labels, contraste, navigation clavier), sans plus.

## 1. Les 3 fonctionnalités du MVP

1. **Recherche textuelle** — par **nom** de médicament, saisie libre, **un ou plusieurs** médicaments (on peut en ajouter plusieurs, comme les lignes d'une ordonnance). Pas de référentiel ni d'auto-complétion.
2. **Pharmacies proches disposant du/des produit(s)** — affichage en **liste + carte Leaflet**, **triées par distance**.
3. **Compteur de couverture** — pour chaque pharmacie proche, **combien des médicaments recherchés sont disponibles** (ex. 3/5), avec le **détail disponible / non par produit**. **Pas de quantité exacte**, juste oui/non par produit.

## 2. Périmètre

**DANS le MVP :**
- Recherche multi-médicaments (par nom).
- Position de l'utilisateur : **géolocalisation navigateur** + repli **saisie d'adresse** (géocodée via l'API Adresse / BAN, gratuite et publique : `https://api-adresse.data.gouv.fr/search/`).
- Tri des pharmacies par distance (haversine).
- Carte Leaflet + liste synchronisées.
- Fiche pharmacie : nom, adresse, distance, horaires, **bouton itinéraire** (deep link vers l'app de cartographie).
- Compteur de couverture (X/Y) + détail dispo/non par produit.
- **Indicateur de fraîcheur** de la donnée de stock + **bandeau visible « données de démonstration »** tant que le stock est mocké.
- États : aucune recherche, aucun résultat, géoloc refusée, chargement, erreur.

**HORS MVP (ne pas construire — ce sont des V1/V2) :**
- Compte / connexion, scan et import d'ordonnance, référentiel/auto-complétion.
- Commande en ligne, click & collect, affichage des équivalences.
- Back-office pharmacien.
- **Vraie** connexion stock LGO (on mocke), hébergement HDS, conformité DSFR complète.

## 3. Données pharmacies (réelles)

- Constituer un **jeu de pharmacies réelles** (nom, adresse, latitude, longitude, horaires) à partir de l'**open data FINESS** (`data.gouv.fr`) pour une ville pilote (ex. Paris) — ~20 à 40 officines suffisent pour le MVP.
- Si tu ne peux pas récupérer FINESS pendant le développement, génère un jeu d'exemple **clairement étiqueté comme tel** dans le README (ne pas présenter des adresses inventées comme réelles).
- Structurer le chargement pour qu'on puisse **remplacer ce jeu par le fichier FINESS complet** plus tard sans changer le code applicatif.

## 4. Architecture du stock (mock, branché côté serveur)

- `lib/stock/StockConnector.ts` — interface + types :
  ```ts
  type ProductAvailability = {
    medication: string;
    status: 'available' | 'unavailable' | 'unknown';
  };
  type PharmacyResult = {
    pharmacyId: string;
    products: ProductAvailability[];
    coverage: { found: number; total: number };  // ex. 3 / 5
    updatedAt: string;                             // fraîcheur
  };
  interface StockConnector {
    checkAvailability(medications: string[], pharmacyIds: string[]): Promise<PharmacyResult[]>;
  }
  ```
- `lib/stock/MockStockConnector.ts` — implémentation réaliste : disponibilité **pseudo-aléatoire mais stable** par (pharmacie, médicament), latence simulée, quelques produits volontairement « non disponibles » pour rendre le compteur parlant. Couvre les 3 statuts.
- `lib/stock/SmartRxStockConnector.ts` — **squelette documenté** (TODO auth + appel réel) ; lève une erreur explicite tant que les accès manquent.
- `lib/stock/index.ts` — sélection via `process.env.STOCK_CONNECTOR` (`mock` par défaut).
- `app/api/search/route.ts` — **route API serveur** : reçoit la liste de médicaments + la position, récupère les pharmacies (data FINESS), interroge le `StockConnector`, calcule couverture + distance, renvoie la liste **triée par distance**. Le connecteur stock ne doit **jamais** être appelé depuis le client (pas d'identifiants LGO côté navigateur, plus tard).

## 5. UI / parcours

- **Une page principale** : barre de recherche (ajout de plusieurs médicaments sous forme de « chips ») + contrôle de position (« utiliser ma position » / « saisir une adresse ») + résultats (carte + liste).
- **Carte Leaflet** : marqueurs colorés selon la couverture (toutes dispo / partielle / aucune), popup = fiche courte ; liste et carte synchronisées.
- **Carte pharmacie (liste)** : nom, distance, badge couverture (3/5), détail dispo/non par produit, horaires, bouton itinéraire.
- Mobile-first, Tailwind, propre et lisible.
- ⚠️ **Gotcha Leaflet + Next.js** : Leaflet a besoin de `window` → importer react-leaflet en **dynamic import avec `ssr: false`**.

## 6. Règles

- **Stock mocké** : ne **jamais** présenter les données simulées comme réelles ; bandeau « démonstration » visible ; ne **jamais** inventer d'endpoints LGO réels ; garder `SmartRxStockConnector` en squelette documenté.
- Pas de scope creep (ni compte, ni scan, ni commande, ni équivalences).
- TypeScript partout ; structure simple et lisible (équipe junior).
- **Tests (Vitest)** : logique de couverture (X/Y), tri par distance (haversine), et le `MockStockConnector`.
- Pas de DSFR ni d'audit RGAA à ce stade ; juste une accessibilité de base.

## 7. Livrables

1. Projet qui tourne : `npm install` puis `npm run dev`.
2. **README** : les 3 fonctionnalités, comment marche le mock **et comment brancher un vrai connecteur LGO**, les sources de données (FINESS, BAN), ce qui est IN / OUT.
3. Tests verts.

## 8. Étapes suggérées

1. Initialiser Next.js + Tailwind, ajouter Leaflet (dynamic import).
2. Constituer le jeu de pharmacies (FINESS) dans `data/`.
3. Écrire `StockConnector` + `MockStockConnector` + squelette `SmartRxStockConnector`.
4. Route API `/api/search` (couverture + distance + tri).
5. Position : géoloc navigateur + saisie d'adresse via BAN.
6. UI : recherche multi-médicaments, carte + liste, fiche, états.
7. Tests + README.
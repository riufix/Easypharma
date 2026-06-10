# Brief POC — EasyPharma (lecture de stock pharmacie) — v3
*Consignes destinées à Claude Code. À lire en entier avant d'écrire du code.*

## 0. Cadre

- EasyPharma est **financé par l'État** ; sa reprise / exploitation par l'État **n'est pas actée**.
- **Ce POC est un test de faisabilité interne et jetable**, pas le produit public. Les obligations d'un éventuel futur service public (DSFR, accessibilité RGAA, agrément SIG) **ne s'appliquent PAS à ce POC**.
- **La stack du POC est volontairement différente de la stack cible du produit** (qui sera React Native / MapLibre / Supabase). Ici : **Next.js + Tailwind + Leaflet**. C'est normal et assumé : le POC est jetable.

## 1. Objectif

Le seul vrai inconnu du projet est **la lecture du stock réel d'une pharmacie**. Le reste (recherche, carte, géoloc) est connu, à faible risque. Ce POC **prouve une seule chose** : on sait lire l'état de stock d'un médicament dans le système d'une pharmacie, via l'API d'un éditeur de logiciel de gestion d'officine (LGO).

La carte (Leaflet) et l'UI ne sont là que pour **rendre la démonstration présentable** — elles ne doivent pas consommer l'essentiel de l'effort.

## 2. Critère de réussite (binaire)

> À partir d'un nom de médicament saisi en texte, l'application affiche, pour quelques pharmacies, l'état de disponibilité (**disponible / non disponible**), la donnée de stock passant par un connecteur LGO.

Réussi si : (1) le flux fonctionne de bout en bout (recherche → connecteur stock → affichage carte + liste), et (2) l'intégration réelle (Smart Rx) est **documentée et branchable** sans refactor.

## 3. Périmètre

**DANS le POC :**
- Recherche texte d'**un seul** médicament (par nom).
- 2 à 3 pharmacies **en dur** (nom, adresse, latitude, longitude).
- Pour chaque pharmacie : **disponible / non disponible** du médicament recherché, via le connecteur de stock.
- Affichage : **carte Leaflet** (marqueurs color\u00e9s selon dispo) **+ liste**, style Tailwind.

**HORS POC (ne pas implémenter) :**
- Géolocalisation réelle de l'utilisateur et tri par proximité (centrer la carte sur une ville suffit ; positions des pharmacies en dur).
- Compteur multi-produits « 3/5 » (optionnel en bonus si le reste est fini — trivial une fois le stock lu).
- Comptes, ordonnances, scan, authentification.
- DSFR, accessibilité RGAA, déploiement, base de données, multi-pharmacies à grande échelle.

## 4. APIs et sources à étudier (AVANT de coder)

Rechercher et lire la documentation, puis **consigner dans le README le contrat réel observé** (endpoints, authentification, format de réponse, conditions d'accès).

1. **Smart Rx — portail développeur** → `https://developer.pharmanuage.fr/` — **cible principale.** LGO du groupe Cegedim (~9 000 pharmacies). API d'accès aux catalogues produits, **aux stocks** et aux ventes. *Nécessite une inscription partenaire / des accès — voir §5.*
2. **Winpharma — « Winpasserelle »** — webservice éditeur exposant prix et stocks. Alternative.
3. **Apotekisto** → `https://www.apotekisto.fr/logiciel-gestion-officine-lgo` — connecteur tiers reliant déjà la plupart des LGO. Référence du pattern d'intégration.

Contexte (facultatif) : **FINESS / Annuaire Santé** (data.gouv.fr) pour obtenir 2-3 vraies pharmacies (nom, adresse, coordonnées GPS) à mettre en dur, plutôt que des données inventées.

## 5. Réalité d'accès — point critique

Les API LGO de production exigent des **identifiants et un partenariat** que Claude Code n'a pas. Ce volet se règle par des contacts commerciaux, hors de ce POC.

**Conséquence sur le code :** construire contre un **mock réaliste** placé derrière une interface `StockConnector`, côté serveur, de sorte que le connecteur Smart Rx réel se branche ensuite **sans rien refactorer**. Le mock imite la **forme** du contrat réel documenté au §4.

⚠️ **Ne jamais inventer d'endpoints réels.** Si la doc Smart Rx n'est pas accessible sans compte partenaire, le signaler dans le README et étiqueter le contrat du mock comme **hypothétique**. Ne jamais présenter des données simulées comme réelles.

## 6. Architecture demandée (Next.js + Tailwind + Leaflet)

- **Next.js** (App Router, TypeScript) + **Tailwind CSS** + **react-leaflet / Leaflet**.
- Le connecteur de stock vit **côté serveur** (route API), pour que d'éventuels identifiants LGO ne soient jamais expos\u00e9s au client.

Arborescence indicative :
- `lib/stock/StockConnector.ts` — interface + types :
  ```ts
  type Availability = { status: 'available' | 'unavailable' | 'unknown'; raw?: unknown };
  interface StockConnector {
    checkAvailability(medicationName: string, pharmacyId: string): Promise<Availability>;
  }
  ```
- `lib/stock/MockStockConnector.ts` — données simulées, latence simulée, couvre les 3 statuts.
- `lib/stock/SmartRxStockConnector.ts` — **squelette documenté** (TODO auth + appel) ; lève une erreur explicite tant que les accès manquent.
- `lib/stock/index.ts` — sélection du connecteur via `process.env.STOCK_CONNECTOR` (`mock` par défaut).
- `app/api/availability/route.ts` — route API serveur : reçoit un nom de médicament, interroge le connecteur pour chaque pharmacie, renvoie la liste avec statut.
- `data/pharmacies.ts` — 2-3 pharmacies en dur (nom, adresse, lat, lng ; idéalement issues de FINESS).
- `app/page.tsx` — champ de recherche + carte Leaflet (marqueurs colorés par statut) + liste, style Tailwind.
- Tests (Vitest) sur le connecteur (les 3 statuts).

⚠️ **Gotcha Leaflet + Next.js :** Leaflet a besoin de `window`, donc importer react-leaflet en **dynamic import avec `ssr: false`** (sinon erreur au rendu serveur).

## 7. Livrables attendus

1. Un repo qui tourne avec `npm install` puis `npm run dev`.
2. Un **README** : objectif, **résultats de la recherche d'API** (contrat réel ou hypothèse étiquetée), procédure pour passer du mock au connecteur réel, critère de réussite, note sur le « POC d'accès ».
3. Un court **compte rendu** : ce qui est prouvé, ce qui reste à valider (notamment l'accès).

## 8. Étapes suggérées

1. Rechercher et lire les docs API (§4) ; consigner le contrat réel.
2. Initialiser le projet Next.js + Tailwind ; ajouter Leaflet.
3. Définir l'interface `StockConnector` d'après le contrat ; implémenter `MockStockConnector`.
4. Implémenter le squelette `SmartRxStockConnector` (auth + endpoint en TODO).
5. Créer la route API `/api/availability` et les pharmacies en dur.
6. Construire la page : recherche + carte Leaflet + liste.
7. Tests + README + compte rendu.

## 9. À ne pas faire

- Pas de scope creep : ni géoloc réelle, ni tri par proximité, ni comptes, ni ordonnances.
- Pas de DSFR, pas d'accessibilité RGAA, pas de design soigné — hors POC (cf. §0).
- Pas d'endpoints inventés présentés comme réels (cf. §5).
- Pas de données simulées présentées comme réelles.
- Pas de sur-ingénierie : ce code est jetable, il prouve juste la faisabilité de la lecture de stock.

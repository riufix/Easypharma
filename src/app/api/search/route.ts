import { NextResponse } from "next/server";
import { getStockConnector } from "@/lib/stock";
import type { ProductAvailability } from "@/lib/stock";
import { computeCoverage } from "@/lib/stock/StockConnector";
import { loadPharmaciesNear } from "@/lib/pharmacies";
import { sortByDistance } from "@/lib/geo";

/**
 * Route API serveur de recherche (MVP).
 *
 *   POST /api/search
 *   body { medications: string[], lat: number, lng: number, radiusKm?: number }
 *
 * 1) charge DYNAMIQUEMENT les pharmacies de la zone (Overpass/OSM, repli local),
 *    triées par distance (haversine) ; 2) interroge le StockConnector pour la
 *    disponibilité de chaque médicament ; 3) calcule la couverture X/Y ;
 *    4) renvoie la liste triée.
 *
 * Le connecteur de stock — et de futurs identifiants LGO — reste CÔTÉ SERVEUR.
 */

export type SearchResultPharmacy = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  distanceKm: number;
  products: ProductAvailability[];
  coverage: { found: number; total: number };
  updatedAt: string | null;
};

export type SearchResponse = {
  results: SearchResultPharmacy[];
  /** Source des pharmacies réellement utilisée (osm/overpass ou repli local). */
  source: "overpass" | "local";
  /** Nombre total trouvé dans le rayon, si la liste a été plafonnée (sinon absent). */
  truncatedFrom?: number;
  /** true si le stock provient d'un connecteur simulé (bandeau démo). */
  mocked: boolean;
  /** message d'erreur connecteur stock (ex. accès LGO manquants), si applicable. */
  stockError?: string;
};

const DEFAULT_RADIUS_KM = 2;
/** Plafond de pharmacies traitées par requête (bornage des appels stock). */
const MAX_PHARMACIES = 150;

export async function POST(request: Request) {
  let body: { medications?: unknown; lat?: unknown; lng?: unknown; radiusKm?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Position (lat, lng) requise et numérique." },
      { status: 400 },
    );
  }

  const radiusKm =
    Number.isFinite(Number(body.radiusKm)) && Number(body.radiusKm) > 0
      ? Number(body.radiusKm)
      : DEFAULT_RADIUS_KM;

  const medications = Array.isArray(body.medications)
    ? body.medications.map((m) => String(m).trim()).filter((m) => m.length > 0)
    : [];

  // 1) Pharmacies de la zone (chargement dynamique), triées par distance.
  const { pharmacies, source } = await loadPharmaciesNear({ lat, lng }, radiusKm);
  const sorted = sortByDistance({ lat, lng }, pharmacies);
  const truncatedFrom = sorted.length > MAX_PHARMACIES ? sorted.length : undefined;
  const nearby = sorted.slice(0, MAX_PHARMACIES);

  // Pas de médicament recherché : pharmacies proches sans interrogation de stock.
  if (medications.length === 0) {
    const results: SearchResultPharmacy[] = nearby.map((p) => ({
      ...toBase(p),
      products: [],
      coverage: { found: 0, total: 0 },
      updatedAt: null,
    }));
    return NextResponse.json({
      results,
      source,
      truncatedFrom,
      mocked: isMocked(),
    } satisfies SearchResponse);
  }

  // 2-3) Interrogation du connecteur de stock + couverture.
  const connector = getStockConnector();
  const ids = nearby.map((p) => p.id);

  try {
    const stock = await connector.checkAvailability(medications, ids);
    const byId = new Map(stock.map((s) => [s.pharmacyId, s]));
    const results: SearchResultPharmacy[] = nearby.map((p) => {
      const s = byId.get(p.id);
      const products = s?.products ?? [];
      return {
        ...toBase(p),
        products,
        coverage: s?.coverage ?? computeCoverage(products),
        updatedAt: s?.updatedAt ?? null,
      };
    });
    return NextResponse.json({
      results,
      source,
      truncatedFrom,
      mocked: isMocked(),
    } satisfies SearchResponse);
  } catch (err) {
    // Connecteur défaillant (ex. Smart Rx sans accès) : on n'échoue pas toute la
    // requête — pharmacies renvoyées en statut "unknown" + message.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[search] connecteur stock: ${message}`);
    const results: SearchResultPharmacy[] = nearby.map((p) => {
      const products: ProductAvailability[] = medications.map((medication) => ({
        medication,
        status: "unknown" as const,
      }));
      return {
        ...toBase(p),
        products,
        coverage: computeCoverage(products),
        updatedAt: null,
      };
    });
    return NextResponse.json({
      results,
      source,
      truncatedFrom,
      mocked: isMocked(),
      stockError: message,
    } satisfies SearchResponse);
  }
}

function isMocked(): boolean {
  return (process.env.STOCK_CONNECTOR ?? "mock").toLowerCase() !== "smartrx";
}

function toBase(p: {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
  distanceKm: number;
}) {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    hours: p.hours,
    distanceKm: p.distanceKm,
  };
}

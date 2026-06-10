import { NextResponse } from "next/server";
import { getStockConnector } from "@/lib/stock";
import type { AvailabilityStatus } from "@/lib/stock";
import { PHARMACIES } from "@/data/pharmacies";

/**
 * Route API serveur : lecture de stock pour TOUTES les pharmacies en dur.
 *
 *   GET /api/availability?medication=<nom du médicament>
 *
 * Pour chaque pharmacie, interroge le connecteur de stock (mock par défaut,
 * sélectionné par STOCK_CONNECTOR) et renvoie son statut de disponibilité.
 *
 * Le connecteur — et donc d'éventuels identifiants LGO — reste côté serveur :
 * jamais exposé au client (cf. POC_Brief §6).
 */

export type AvailabilityResult = {
  pharmacy: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  status: AvailabilityStatus;
  /** Renseigné si l'appel connecteur a échoué pour cette pharmacie. */
  error?: string;
};

export type AvailabilityResponse = {
  medication: string;
  results: AvailabilityResult[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const medication = (searchParams.get("medication") ?? "").trim();

  if (!medication) {
    return NextResponse.json(
      { error: "Paramètre 'medication' requis." },
      { status: 400 },
    );
  }

  const connector = getStockConnector();

  const results: AvailabilityResult[] = await Promise.all(
    PHARMACIES.map(async (pharmacy) => {
      const base = {
        pharmacy: {
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          lat: pharmacy.lat,
          lng: pharmacy.lng,
        },
      };
      try {
        const availability = await connector.checkAvailability(
          medication,
          pharmacy.id,
        );
        return { ...base, status: availability.status };
      } catch (err) {
        // Un connecteur défaillant (ex. Smart Rx sans accès) ne doit pas casser
        // toute la réponse : on dégrade en "unknown" et on remonte le message.
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[availability] pharmacie ${pharmacy.id} : ${message}`,
        );
        return { ...base, status: "unknown" as AvailabilityStatus, error: message };
      }
    }),
  );

  return NextResponse.json({ medication, results } satisfies AvailabilityResponse);
}

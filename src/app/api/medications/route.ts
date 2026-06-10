import { NextResponse } from "next/server";
import { searchMedications } from "@/lib/medications";

/**
 * Autocomplétion de noms de médicaments (référentiel BDPM, côté serveur).
 *
 *   GET /api/medications?q=<saisie>
 *   → { suggestions: string[] }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const suggestions = searchMedications(q, 10);
  return NextResponse.json({ suggestions });
}

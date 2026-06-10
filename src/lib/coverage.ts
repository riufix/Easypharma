/** Classification de la couverture d'une pharmacie pour l'affichage (couleurs). */

export type CoverageLevel = "neutral" | "full" | "partial" | "none";

/**
 * neutral = aucune recherche de médicament (total 0)
 * full    = tous les médicaments disponibles
 * partial = certains disponibles
 * none    = aucun disponible
 */
export function coverageLevel(coverage: { found: number; total: number }): CoverageLevel {
  if (coverage.total === 0) return "neutral";
  if (coverage.found === coverage.total) return "full";
  if (coverage.found > 0) return "partial";
  return "none";
}

export const LEVEL_COLOR: Record<CoverageLevel, string> = {
  neutral: "#64748b", // slate
  full: "#16a34a", // vert
  partial: "#f59e0b", // ambre
  none: "#dc2626", // rouge
};

export const LEVEL_LABEL: Record<CoverageLevel, string> = {
  neutral: "Aucune recherche",
  full: "Tous disponibles",
  partial: "Partiellement disponible",
  none: "Aucun disponible",
};

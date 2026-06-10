import pharmaciesData from "./pharmacies.paris.json";
import type { Pharmacy } from "@/lib/pharmacies/types";

/**
 * Jeu de pharmacies de SECOURS (Paris) — utilisé en repli si la source
 * dynamique (Overpass / OSM) est indisponible. Voir `src/lib/pharmacies/`.
 *
 * Données RÉELLES issues de l'open data FINESS (dataset
 * « carte-des-pharmacies-de-paris ») :
 * https://data.iledefrance.fr/explore/dataset/carte-des-pharmacies-de-paris/
 * Champs réels : `name`, `address`, `id` (n° FINESS), `lat`/`lng`.
 *
 * ⚠️ `hours` (horaires) n'existe PAS dans FINESS : valeurs ILLUSTRATIVES (README).
 */
export const PHARMACIES: Pharmacy[] = pharmaciesData as Pharmacy[];

/** Centre de carte par défaut (Paris centre) si la géoloc n'est pas disponible. */
export const DEFAULT_CENTER: [number, number] = [48.8534, 2.3488];

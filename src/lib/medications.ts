import data from "@/data/medications.json";

/**
 * Référentiel de noms de médicaments RÉELS, pour l'autocomplétion.
 *
 * Source : BDPM — Base de Données Publique des Médicaments (fichier `CIS_bdpm.txt`,
 * dénominations des spécialités), service public :
 * https://base-donnees-publique.medicaments.gouv.fr/
 *
 * Utilisé UNIQUEMENT côté serveur (route /api/medications) : le fichier (~0,9 Mo)
 * n'est pas envoyé au navigateur.
 */

const NAMES = data as string[];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Index normalisé calculé une fois au chargement du module.
const INDEX: Array<{ name: string; norm: string }> = NAMES.map((name) => ({
  name,
  norm: normalize(name),
}));

/**
 * Renvoie jusqu'à `limit` suggestions pour `query` : les dénominations qui
 * COMMENCENT par la requête d'abord, puis celles qui la CONTIENNENT.
 */
export function searchMedications(query: string, limit = 10): string[] {
  const q = normalize(query);
  if (q.length < 1) return [];
  const starts: string[] = [];
  const includes: string[] = [];
  for (const entry of INDEX) {
    if (entry.norm.startsWith(q)) starts.push(entry.name);
    else if (entry.norm.includes(q)) includes.push(entry.name);
    if (starts.length >= limit) break; // assez de correspondances prioritaires
  }
  return [...starts, ...includes].slice(0, limit);
}

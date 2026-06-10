/**
 * Bandeau permanent : tant que le stock est mocké, on ne présente JAMAIS les
 * données simulées comme réelles (règle MVP §6).
 */
export default function DemoBanner() {
  return (
    <div
      role="status"
      className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900"
    >
      ⚠️ Données de stock de <strong>démonstration</strong> (simulées) — la connexion
      aux vraies pharmacies n&apos;est pas encore active.
    </div>
  );
}

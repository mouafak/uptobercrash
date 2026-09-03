/**
 * Bannière d'arrêt. Affichée quand `SALE_PAUSED` vaut `true`.
 *
 * Elle n'est qu'informative : le refus des achats est prononcé côté serveur
 * par la route d'écriture, pas ici.
 */
export default function SalePausedBanner() {
  return (
    <div
      role="status"
      className="flex-center w-full shrink-0 bg-destructive px-4 py-2 text-center text-sm font-medium text-card-foreground"
    >
      Purchases are temporarily paused. Please check back shortly.
    </div>
  );
}

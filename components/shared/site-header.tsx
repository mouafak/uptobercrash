import { ArrowLeft } from 'lucide-react';

import { PROJECT } from '@/config/project';
import BrandLogo from './brand-logo';

/**
 * En-tête, sans fond propre : le haut du dégradé de page valant déjà la couleur
 * des cartes, une barre opaque n'y aurait rien ajouté qu'une jointure visible.
 * Le texte passe donc sur `--foreground`, celui du fond de page.
 */
export default function SiteHeader() {
  return (
    <header className="h-20 w-full shrink-0 bg-transparent">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
        <a
          href={PROJECT.homeUrl}
          className="flex items-center gap-3 text-foreground"
        >
          <BrandLogo variant="mark" className="h-10 w-10" priority />
          <span className="font-heading text-lg">{PROJECT.name}</span>
        </a>

        <a
          href={PROJECT.homeUrl}
          className="flex items-center gap-2 text-sm text-foreground transition-opacity hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </a>
      </div>
    </header>
  );
}

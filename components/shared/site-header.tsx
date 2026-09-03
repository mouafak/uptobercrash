import { ArrowLeft } from 'lucide-react';

import { PROJECT } from '@/config/project';
import BrandLogo from './brand-logo';

export default function SiteHeader() {
  return (
    <header className="h-20 w-full shrink-0 bg-card">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
        <a
          href={PROJECT.homeUrl}
          className="flex items-center gap-3 text-card-foreground"
        >
          <BrandLogo variant="mark" className="h-10 w-10" priority />
          <span className="font-heading text-lg">{PROJECT.name}</span>
        </a>

        <a
          href={PROJECT.homeUrl}
          className="flex items-center gap-2 text-sm text-card-foreground transition-opacity hover:opacity-70"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Home
        </a>
      </div>
    </header>
  );
}

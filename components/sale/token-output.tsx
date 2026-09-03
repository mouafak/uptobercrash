'use client';

import BrandLogo from '@/components/shared/brand-logo';
import { PROJECT } from '@/config/project';
import { useSale } from '@/context/sale-provider';
import { formatTokens } from '@/lib/format';

/** Contrepartie en tokens. Non éditable : la valeur est dérivée, pas saisie. */
export default function TokenOutput() {
  const { tokenAmount } = useSale();

  return (
    <div className="h-24 w-full rounded-lg bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">You get</span>
      </div>

      <div className="mt-1 flex items-center justify-between gap-3">
        <output className="w-full truncate font-heading text-3xl text-card-foreground">
          {formatTokens(tokenAmount)}
        </output>

        <span className="flex-center h-8 shrink-0 gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-card-foreground">
          <BrandLogo variant="mark" className="h-4 w-4" />
          {PROJECT.tokenSymbol}
        </span>
      </div>
    </div>
  );
}

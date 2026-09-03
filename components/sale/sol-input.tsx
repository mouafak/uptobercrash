'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import BrandLogo from '@/components/shared/brand-logo';
import SolanaMark from '@/components/shared/solana-mark';
import { useSale } from '@/context/sale-provider';
import { formatRate } from '@/lib/format';

/**
 * Champ de saisie du montant en SOL.
 *
 * Le filtre de saisie interdit tout ce qui n'est pas un décimal à quatre
 * chiffres après la virgule. La validation métier, elle, vit dans `core/` et
 * remonte par le contexte : ce composant ne décide rien.
 */

/** Chiffres, un point facultatif, quatre décimales au plus. */
const ACCEPTED_INPUT = /^\d*\.?\d{0,4}$/;

/** Masque les flèches natives du champ numérique. */
const NO_SPINNER =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export default function SolInput() {
  const { primaryWallet } = useDynamicContext();
  const { solInput, setSolInput, inputError } = useSale();

  const connected = primaryWallet !== null;

  return (
    <div>
      <div className="h-24 w-full rounded-lg bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">You pay</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            1 SOL = {formatRate()}
            <BrandLogo variant="mark" className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            aria-label="Amount in SOL"
            disabled={!connected}
            value={solInput}
            onChange={(event) => {
              const next = event.target.value;
              if (ACCEPTED_INPUT.test(next)) setSolInput(next);
            }}
            className={`w-full bg-transparent font-heading text-3xl text-card-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 ${NO_SPINNER}`}
          />

          <span className="flex-center h-8 shrink-0 gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-card-foreground">
            <SolanaMark className="h-3 w-4 object-contain" />
            SOL
          </span>
        </div>
      </div>

      {/* Hauteur réservée : le message ne doit pas décaler la mise en page. */}
      <p className="min-h-4 px-1 pt-1 text-[11px] text-destructive">
        {connected ? inputError : null}
      </p>
    </div>
  );
}

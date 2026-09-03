'use client';

import { useEffect, useState } from 'react';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import { getBalance } from '@/app/actions/read';
import BrandLogo from '@/components/shared/brand-logo';
import { PROJECT } from '@/config/project';
import { useSale } from '@/context/sale-provider';
import { formatTokens } from '@/lib/format';

/**
 * Solde de tokens déjà achetés.
 *
 * Quatre états distincts, jamais confondus. En particulier, le chargement
 * n'affiche pas zéro : montrer « 0 » à quelqu'un qui a acheté est un mensonge
 * le temps d'un aller-retour réseau.
 */

type State =
  | { status: 'disconnected' }
  | { status: 'loading' }
  | { status: 'ready'; tokens: bigint }
  | { status: 'error' };

export default function Balance() {
  const { primaryWallet } = useDynamicContext();
  const { balanceVersion } = useSale();
  const [state, setState] = useState<State>({ status: 'disconnected' });

  const address = primaryWallet?.address ?? null;

  useEffect(() => {
    if (address === null) {
      setState({ status: 'disconnected' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    getBalance(address)
      .then((balance) => {
        if (!cancelled) {
          setState({ status: 'ready', tokens: BigInt(balance.totalTokens) });
        }
      })
      .catch((error: unknown) => {
        console.error('[balance] lecture du solde impossible', error);
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [address, balanceVersion]);

  return (
    <div className="flex h-12 w-full items-center justify-between rounded-lg border border-border px-3">
      <span className="text-xs text-muted-foreground">Your balance</span>

      <div className="flex items-center gap-2">
        {state.status === 'loading' ? (
          <span className="h-4 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <span className="text-sm font-medium text-card-foreground">
            {state.status === 'ready'
              ? `${formatTokens(state.tokens)} ${PROJECT.tokenSymbol}`
              : state.status === 'error'
                ? 'Unavailable'
                : '—'}
          </span>
        )}
        <BrandLogo variant="mark" className="h-5 w-5" />
      </div>
    </div>
  );
}

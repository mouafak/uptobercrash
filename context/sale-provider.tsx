'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { BusinessError } from '@/core/errors';
import { solToLamports } from '@/core/money';
import { isAmountValid, tokensForLamports } from '@/core/rules';

/**
 * État partagé du formulaire d'achat.
 *
 * Le champ saisi est une chaîne, et le reste en est dérivé par `core/`. Aucun
 * montant n'est stocké sous forme de nombre, et aucun composant n'aura à en
 * calculer un : tout est déjà là.
 */

type SaleContextValue = {
  solInput: string;
  setSolInput: (value: string) => void;
  /** Dérivé de `solInput`. Vaut 0 tant que la saisie est vide ou invalide. */
  lamports: bigint;
  /** Dérivé de `lamports`. */
  tokenAmount: bigint;
  /** Dérivé. `null` tant que l'utilisateur n'a rien saisi. */
  inputError: string | null;
  /** Lu une seule fois au montage, depuis `?code=`. */
  affiliateCode: string | null;
  refreshBalance: () => void;
  /**
   * Incrémenté par `refreshBalance`. Les composants qui affichent un solde
   * s'en servent comme dépendance pour se recharger.
   */
  balanceVersion: number;
};

const SaleContext = createContext<SaleContextValue | null>(null);

type Derived = {
  lamports: bigint;
  tokenAmount: bigint;
  inputError: string | null;
};

const EMPTY: Derived = { lamports: 0n, tokenAmount: 0n, inputError: null };

function derive(solInput: string): Derived {
  // Rien de saisi : pas de montant, mais pas d'erreur non plus. Reprocher un
  // champ vide avant que l'utilisateur n'ait tapé serait gratuit.
  if (solInput.trim() === '') return EMPTY;

  let lamports: bigint;
  try {
    lamports = solToLamports(solInput);
  } catch (error) {
    if (error instanceof BusinessError) {
      return { ...EMPTY, inputError: 'Enter a valid amount' };
    }
    throw error;
  }

  const validity = isAmountValid(lamports);
  return {
    lamports,
    tokenAmount: tokensForLamports(lamports),
    inputError: validity.ok ? null : validity.reason,
  };
}

/** Lit `?code=` sans passer par `useSearchParams`, qui forcerait un Suspense. */
function readAffiliateCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('code');
  return code === null || code === '' ? null : code;
}

export default function SaleProvider({ children }: { children: ReactNode }) {
  const [solInput, setSolInput] = useState('');
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [balanceVersion, setBalanceVersion] = useState(0);

  // Une seule lecture, au montage. Le code est ensuite figé : le relire au
  // moment de l'achat exposerait à un changement d'URL entre-temps.
  useEffect(() => {
    setAffiliateCode(readAffiliateCodeFromUrl());
  }, []);

  const refreshBalance = useCallback(() => {
    setBalanceVersion((version) => version + 1);
  }, []);

  const derived = useMemo(() => derive(solInput), [solInput]);

  const value = useMemo<SaleContextValue>(
    () => ({
      solInput,
      setSolInput,
      lamports: derived.lamports,
      tokenAmount: derived.tokenAmount,
      inputError: derived.inputError,
      affiliateCode,
      refreshBalance,
      balanceVersion,
    }),
    [solInput, derived, affiliateCode, refreshBalance, balanceVersion],
  );

  return <SaleContext value={value}>{children}</SaleContext>;
}

export function useSale(): SaleContextValue {
  const context = useContext(SaleContext);
  if (context === null) {
    throw new Error('useSale doit être appelé sous <SaleProvider>.');
  }
  return context;
}

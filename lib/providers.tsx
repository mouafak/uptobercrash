'use client';

import type { ReactNode } from 'react';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';

import { publicEnv } from '@/config/env';
import SaleProvider from '@/context/sale-provider';

/**
 * Connexion de portefeuille.
 *
 * `connect-only` : l'application ne demande aucune signature d'authentification.
 * Elle n'a pas de comptes, seulement des adresses — un message à signer serait
 * une friction sans contrepartie.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        environmentId: publicEnv.NEXT_PUBLIC_DYNAMIC_ENV_ID,
        walletConnectors: [SolanaWalletConnectors],
        initialAuthenticationMode: 'connect-only',
        // La majorité du trafic arrive de Telegram ou X sur mobile, où la
        // redirection vers l'application du portefeuille perd l'utilisateur.
        mobileExperience: 'in-app-browser',
        recommendedWallets: [
          { walletKey: 'phantom' },
          { walletKey: 'solflare' },
        ],
      }}
    >
      <SaleProvider>{children}</SaleProvider>
    </DynamicContextProvider>
  );
}

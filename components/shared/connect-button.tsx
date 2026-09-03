'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import { Button } from '@/components/ui/button';

/** Visible uniquement hors connexion. */
export default function ConnectButton() {
  const { primaryWallet, sdkHasLoaded, setShowAuthFlow } = useDynamicContext();

  if (primaryWallet !== null) return null;

  return (
    <Button
      className="h-12 w-full text-base"
      disabled={!sdkHasLoaded}
      onClick={() => setShowAuthFlow(true)}
    >
      {sdkHasLoaded ? 'Connect Wallet' : 'Loading wallets…'}
    </Button>
  );
}

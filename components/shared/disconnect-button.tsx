'use client';

import { useState } from 'react';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import { Button } from '@/components/ui/button';

/** Visible uniquement connecté. Discret : c'est une sortie, pas une action. */
export default function DisconnectButton() {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const [pending, setPending] = useState(false);

  if (primaryWallet === null) return null;

  async function disconnect() {
    setPending(true);
    try {
      await handleLogOut();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      className="h-8 w-full text-xs text-muted-foreground"
      disabled={pending}
      onClick={disconnect}
    >
      {pending ? 'Disconnecting…' : 'Disconnect'}
    </Button>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import type { AffiliateView } from '@/app/actions/read';
import { getAffiliateState } from '@/app/actions/read';
import CopyButton from '@/components/shared/copy-button';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { PROJECT } from '@/config/project';
import { formatCommissionPercent, formatSol } from '@/lib/format';

/**
 * Tiroir d'affiliation.
 *
 * Les statistiques ne sont rafraîchies que tiroir ouvert : un intervalle qui
 * tourne sur un panneau fermé interroge la base pour personne.
 */

const REFRESH_MS = 10_000;

export default function AffiliateDrawer() {
  const { primaryWallet } = useDynamicContext();
  const address = primaryWallet?.address ?? null;

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<AffiliateView | null>(null);
  const [failed, setFailed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    if (address === null) return;
    try {
      setState(await getAffiliateState(address));
      setFailed(false);
    } catch (error) {
      console.error('[affiliate] lecture impossible', error);
      setFailed(true);
    }
  }, [address]);

  useEffect(() => {
    if (!open || address === null) return;

    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [open, address, load]);

  async function requestLink() {
    if (address === null) return;
    setRequesting(true);
    try {
      const response = await fetch('/api/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await load();
    } catch (error) {
      console.error('[affiliate] demande de lien impossible', error);
      setFailed(true);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="h-11 w-full text-sm">
          Earn {formatCommissionPercent()}% commission
        </Button>
      </DrawerTrigger>

      <DrawerContent className="bg-card text-card-foreground">
        <DrawerHeader>
          <DrawerTitle className="font-heading">Affiliate program</DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            Earn {formatCommissionPercent()}% of every purchase made through
            your link.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-8">
          <AffiliateBody
            address={address}
            state={state}
            failed={failed}
            requesting={requesting}
            onRequest={requestLink}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function AffiliateBody({
  address,
  state,
  failed,
  requesting,
  onRequest,
}: {
  address: string | null;
  state: AffiliateView | null;
  failed: boolean;
  requesting: boolean;
  onRequest: () => void;
}) {
  if (address === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Connect your wallet to see your affiliate link.
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-sm text-destructive">
        Could not load your affiliate data. Please try again.
      </p>
    );
  }

  if (state === null) {
    return (
      <div className="space-y-2" aria-busy="true">
        <span className="block h-4 w-2/3 animate-pulse rounded bg-muted" />
        <span className="block h-10 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!state.hasPurchased) {
    return (
      <p className="text-sm text-muted-foreground">
        You need at least one purchase before you can get an affiliate link.
      </p>
    );
  }

  if (state.code === null) {
    return (
      <Button className="h-11 w-full" disabled={requesting} onClick={onRequest}>
        {requesting ? 'Requesting…' : 'Request affiliate link'}
      </Button>
    );
  }

  const link = `${PROJECT.appUrl}?code=${state.code}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
        <span className="truncate text-xs text-card-foreground">{link}</span>
        <CopyButton value={link} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Link used" value={state.referredPurchases.toString()} />
        <Stat
          label="SOL earned"
          value={formatSol(BigInt(state.commissionLamports))}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-heading text-xl text-card-foreground">{value}</p>
    </div>
  );
}

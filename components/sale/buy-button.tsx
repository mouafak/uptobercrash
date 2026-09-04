'use client';

import { useEffect, useState } from 'react';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { isSolanaWallet } from '@dynamic-labs/solana';
import {
  PublicKey,
  SystemProgram,
  Transaction,
  type Connection,
} from '@solana/web3.js';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { publicEnv } from '@/config/env';
import { PROJECT } from '@/config/project';
import { isSaleOpen } from '@/core/rules';
import { useSale } from '@/context/sale-provider';
import { formatTokens } from '@/lib/format';

/**
 * Seul composant orchestrant une transaction.
 *
 * Il ne calcule aucun montant : il lit `lamports` dans le contexte et ne
 * transmet qu'une signature à l'API, qui relira la chaîne pour son compte.
 */

type Step = 'idle' | 'signing' | 'sending' | 'confirming';

const LABELS: Record<Step, string> = {
  idle: 'Buy Tokens',
  signing: 'Signing…',
  sending: 'Sending…',
  confirming: 'Confirming…',
};

const CONFIRMATION_TIMEOUT_MS = 60_000;
const CONFIRMATION_INTERVAL_MS = 2_000;

type Outcome =
  | { kind: 'confirmed' }
  | { kind: 'failed'; reason: string }
  | { kind: 'timeout' };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attend la confirmation. La première vérification est immédiate : commencer
 * par attendre deux secondes rallonge chaque achat pour rien.
 */
async function waitForConfirmation(
  connection: Connection,
  signature: string,
): Promise<Outcome> {
  const deadline = Date.now() + CONFIRMATION_TIMEOUT_MS;

  for (;;) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];

    if (status != null) {
      if (status.err !== null) {
        return { kind: 'failed', reason: JSON.stringify(status.err) };
      }
      if (
        status.confirmationStatus === 'confirmed' ||
        status.confirmationStatus === 'finalized'
      ) {
        return { kind: 'confirmed' };
      }
    }

    if (Date.now() >= deadline) return { kind: 'timeout' };
    await sleep(CONFIRMATION_INTERVAL_MS);
  }
}

export default function BuyButton({ paused = false }: { paused?: boolean }) {
  const { primaryWallet } = useDynamicContext();
  const {
    lamports,
    tokenAmount,
    inputError,
    affiliateCode,
    refreshBalance,
    setSolInput,
  } = useSale();

  const [step, setStep] = useState<Step>('idle');
  const [saleOpen, setSaleOpen] = useState(true);

  // Calculé côté client uniquement : comparer les horloges au rendu serveur
  // provoquerait une divergence d'hydratation.
  useEffect(() => {
    const check = () => setSaleOpen(isSaleOpen(new Date()));
    check();
    const id = setInterval(check, 1_000);
    return () => clearInterval(id);
  }, []);

  const connected = primaryWallet !== null;
  const busy = step !== 'idle';
  const amountReady = lamports > 0n && inputError === null;
  const disabled = !connected || !saleOpen || paused || !amountReady || busy;

  async function buy() {
    if (primaryWallet === null || !isSolanaWallet(primaryWallet)) {
      toast.error('Connect a Solana wallet to continue.');
      return;
    }

    let signature: string | null = null;

    try {
      const connection = await primaryWallet.getConnection();
      const signer = await primaryWallet.getSigner();
      const payer = new PublicKey(primaryWallet.address);

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        feePayer: payer,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: new PublicKey(publicEnv.NEXT_PUBLIC_TREASURY_ADDRESS),
          lamports,
        }),
      );

      setStep('signing');
      const signed = await signer.signTransaction(transaction);

      setStep('sending');
      signature = await connection.sendRawTransaction(signed.serialize());

      setStep('confirming');
      const outcome = await waitForConfirmation(connection, signature);

      if (outcome.kind === 'failed') {
        toast.error('Transaction failed on-chain. Nothing was charged twice.');
        return;
      }

      // Un délai dépassé n'est pas un échec : la transaction est peut-être
      // passée. Inviter à réessayer ici, c'est provoquer un double paiement.
      if (outcome.kind === 'timeout') {
        console.warn('[buy] confirmation non obtenue', { signature });
        toast.warning(
          'Still confirming. Your transaction may have gone through — refresh before trying again.',
          { duration: 12_000 },
        );
        return;
      }

      await record(signature);
    } catch (error) {
      if (signature === null) {
        console.error('[buy] échec avant envoi', error);
        toast.error('Could not send the transaction. Please try again.');
      } else {
        // Payé mais non enregistré : surtout ne pas suggérer de réessayer.
        console.error('[buy] échec après envoi', { signature, error });
        toast.warning(
          'Payment sent but not confirmed here — refresh in a moment before trying again.',
          { duration: 12_000 },
        );
      }
    } finally {
      setStep('idle');
    }
  }

  async function record(signature: string) {
    const response = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txHash: signature, affiliateCode }),
    });

    if (!response.ok) {
      // La transaction est confirmée sur la chaîne : l'argent est parti. Le
      // script de réconciliation rattrapera l'enregistrement.
      console.error('[buy] achat confirmé mais non enregistré', {
        signature,
        status: response.status,
      });
      toast.warning(
        'Payment confirmed, but not recorded yet. Refresh in a moment — it will appear.',
        { duration: 12_000 },
      );
      return;
    }

    toast.success(
      `Purchase confirmed — ${formatTokens(tokenAmount)} ${PROJECT.tokenSymbol}`,
    );
    // Le montant a été payé : le laisser dans le champ inviterait à recommencer.
    // Vidé plutôt que mis à « 0 », pour retrouver le libellé indicatif.
    setSolInput('');
    refreshBalance();
  }

  if (!connected) return null;

  return (
    <Button
      className="h-12 w-full text-base"
      disabled={disabled}
      onClick={buy}
    >
      {!saleOpen ? 'Sale ended' : paused ? 'Paused' : LABELS[step]}
    </Button>
  );
}

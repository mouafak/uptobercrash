'use client';

import { useEffect, useRef, useState } from 'react';

import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';

const FEEDBACK_MS = 2_000;

export default function CopyButton({
  value,
  label = 'Copy link',
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current !== null) clearTimeout(timeout.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeout.current !== null) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
    } catch (error) {
      // Le presse-papiers peut être refusé (contexte non sécurisé, permission).
      // On le dit plutôt que de laisser croire à une copie réussie.
      console.error('[copy-button] clipboard refusé', error);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={copied ? 'Copied' : label}
      onClick={copy}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Copy className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}

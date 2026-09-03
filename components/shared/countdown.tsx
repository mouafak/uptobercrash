'use client';

import { useEffect, useState } from 'react';

/**
 * Compte à rebours.
 *
 * Les valeurs portent `suppressHydrationWarning` : l'horloge du serveur et
 * celle du navigateur ne coïncident jamais à la seconde près, et l'écart est
 * sans conséquence.
 */

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;

function remainingAt(endsAt: Date, now: number): Remaining | null {
  const milliseconds = endsAt.getTime() - now;
  if (milliseconds <= 0) return null;

  const total = Math.floor(milliseconds / 1_000);
  return {
    days: Math.floor(total / SECONDS_PER_DAY),
    hours: Math.floor((total % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    minutes: Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: total % SECONDS_PER_MINUTE,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export default function Countdown({ endsAt }: { endsAt: Date }) {
  const [remaining, setRemaining] = useState<Remaining | null>(() =>
    remainingAt(endsAt, Date.now()),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(remainingAt(endsAt, Date.now()));
    }, 1_000);

    return () => clearInterval(id);
  }, [endsAt]);

  // État terminé traité explicitement : quatre zéros laisseraient croire à un
  // compte à rebours en panne.
  if (remaining === null) {
    return (
      <p className="text-sm font-medium text-muted-foreground">Sale ended</p>
    );
  }

  const units: [string, string][] = [
    [pad(remaining.days), 'days'],
    [pad(remaining.hours), 'hrs'],
    [pad(remaining.minutes), 'min'],
    [pad(remaining.seconds), 'sec'],
  ];

  return (
    <div className="flex items-end gap-3">
      {units.map(([value, label]) => (
        <div key={label} className="flex flex-col items-center">
          <span
            suppressHydrationWarning
            className="font-heading text-2xl leading-none text-card-foreground"
          >
            {value}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

import { ArrowDown } from 'lucide-react';

import AffiliateDrawer from '@/components/affiliate/affiliate-drawer';
import Balance from '@/components/sale/balance';
import BuyButton from '@/components/sale/buy-button';
import SolInput from '@/components/sale/sol-input';
import TokenOutput from '@/components/sale/token-output';
import BrandLogo from '@/components/shared/brand-logo';
import SalePausedBanner from '@/components/shared/sale-paused-banner';
import ConnectButton from '@/components/shared/connect-button';
import Countdown from '@/components/shared/countdown';
import DisconnectButton from '@/components/shared/disconnect-button';
import SiteFooter from '@/components/shared/site-footer';
import SiteHeader from '@/components/shared/site-header';
import { serverEnv } from '@/config/env';
import { PROJECT, SALE } from '@/config/project';

// Rendue à chaque requête : sans cela, la page serait figée au build et
// SALE_PAUSED n'aurait aucun effet visible après un redémarrage.
export const dynamic = 'force-dynamic';

export default function Home() {
  const paused = serverEnv.SALE_PAUSED;

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      {paused ? <SalePausedBanner /> : null}

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-96 space-y-4 rounded-lg bg-card p-5">
          <div className="flex-center flex-col gap-2">
            <BrandLogo variant="mark" className="h-14 w-14" priority />
            <span className="font-heading text-xl text-card-foreground">
              {PROJECT.name}
            </span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Private Sale
            </span>
          </div>

          <div className="flex-center">
            <Countdown endsAt={SALE.endsAt} />
          </div>

          <Balance />

          <div className="relative">
            <SolInput />

            {/* Chevauche la jonction des deux champs. */}
            <div className="flex-center pointer-events-none absolute inset-x-0 top-[84px] z-10">
              <div className="flex-center h-8 w-8 rounded-full border border-border bg-muted">
                <ArrowDown
                  className="h-4 w-4 text-card-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>

            <TokenOutput />
          </div>

          <ConnectButton />
          <BuyButton paused={paused} />
          <AffiliateDrawer />
          <DisconnectButton />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}

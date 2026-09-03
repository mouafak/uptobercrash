import type { Metadata } from 'next';

import { Toaster } from '@/components/ui/sonner';
import { PROJECT } from '@/config/project';
import Providers from '@/lib/providers';

import { bodyFont, headingFont } from './fonts';
import './globals.css';

const TITLE = `${PROJECT.name} — Private Sale`;
const DESCRIPTION = `Buy ${PROJECT.tokenSymbol} with SOL during the ${PROJECT.name} private sale.`;

export const metadata: Metadata = {
  metadataBase: new URL(PROJECT.appUrl),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: PROJECT.appUrl,
    siteName: PROJECT.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable}`}
      suppressHydrationWarning={true}
    >
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

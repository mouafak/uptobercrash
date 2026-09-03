import localFont from 'next/font/local';

/**
 * Polices locales.
 *
 * Deux graisses au total sur la police de texte, une seule pour les titres.
 * Les fichiers sont colocalisés dans `app/fonts/` : `next/font/local` les hache
 * et les sert depuis `/_next/static/media` avec préchargement, ce que `public/`
 * ne permettrait pas.
 */

export const headingFont = localFont({
  src: './fonts/dela-gothic-one-v19-latin-regular.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--font-heading',
  fallback: ['Impact', 'Haettenschweiler', 'system-ui', 'sans-serif'],
});

export const bodyFont = localFont({
  src: [
    {
      path: './fonts/dm-sans-v17-latin-regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/dm-sans-v17-latin-500.woff2',
      weight: '500',
      style: 'normal',
    },
  ],
  display: 'swap',
  preload: true,
  variable: '--font-sans',
  fallback: [
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'sans-serif',
  ],
});

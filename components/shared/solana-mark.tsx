import Image from 'next/image';

import solanaMark from '@/public/solana-mark.svg';

/**
 * Logo Solana.
 *
 * Fichier distinct de `brand-logo.tsx`, qui reste réservé à la marque du
 * projet : ce n'est pas notre logo, c'est celui de la chaîne. Comme pour la
 * marque, il n'est référencé qu'ici — le remplacer se fait en un seul endroit.
 */
export default function SolanaMark({ className }: { className?: string }) {
  return <Image src={solanaMark} alt="Solana" className={className} />;
}

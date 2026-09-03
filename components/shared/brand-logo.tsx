import Image from 'next/image';

import logoFull from '@/public/up-logo-full.svg';
import logoMark from '@/public/up-logo-mark.svg';

import { PROJECT } from '@/config/project';

/**
 * Seul fichier du projet à référencer l'image du logo.
 *
 * Tout affichage passe par ici : changer de marque, c'est remplacer deux
 * fichiers dans `public/` et ces deux imports, rien d'autre.
 */

type Props = {
  /** `mark` : la pastille carrée. `full` : le logo avec le texte. */
  variant?: 'mark' | 'full';
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  variant = 'mark',
  className,
  priority = false,
}: Props) {
  const source = variant === 'full' ? logoFull : logoMark;

  return (
    <Image
      src={source}
      alt={PROJECT.name}
      className={className}
      priority={priority}
    />
  );
}

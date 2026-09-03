# Instructions projet

Le plan de construction complet est dans `docs/BUILD-PLAN.md`.
Lis-le entièrement avant toute action et suis ses étapes dans l'ordre.

`AGENTS.md` est généré et maintenu par Next.js lui-même. Ne le supprime pas,
ne le modifie pas, mais lis-le : il pointe vers la documentation de la version
exactement installée.

## Méthode de travail

- Une étape à la fois. À la fin de chaque étape, vérifier son critère de
  validation, montrer les fichiers créés, et s'arrêter. Ne jamais enchaîner
  sur l'étape suivante sans validation explicite.
- Ne jamais coder ce qui n'est pas demandé. Si un ajout semble utile,
  le proposer ; ne pas l'implémenter.
- En cas d'ambiguïté sur une valeur métier, poser la question plutôt que
  de deviner.
- Ne jamais modifier un fichier d'une étape déjà validée sans le signaler.

## Versions

- Next.js 16, pas 15. Turbopack est le défaut : pas de drapeau `--turbopack`.
  `next lint` n'existe plus : utiliser l'ESLint CLI. ESLint 10 impose le
  Flat Config (`eslint.config.mjs`), pas de `.eslintrc`.
- `params` et `searchParams` sont strictement asynchrones. `middleware` est
  renommé `proxy`. `serverRuntimeConfig` et `publicRuntimeConfig` n'existent
  plus.
- Avant d'écrire du code Next, consulter `node_modules/next/dist/docs/`.
  Ne pas reproduire un motif appris sur une version antérieure.
- Avant d'utiliser une API d'un paquet, vérifier sa version installée dans
  `package.json`. Ne jamais se fier à la mémoire pour une signature d'API.
  zod est en v4 : son API d'erreurs diffère de la v3.

## Montants et sécurité

- Aucun `parseFloat`, `Number()` ni `Math.pow` sur un montant. BigInt en
  unités de base uniquement, converti en texte seulement à l'affichage.
- Le serveur ne fait jamais confiance à un montant reçu du client. Il lit la
  transaction sur la chaîne et en extrait lui-même montant et expéditeur.
- La table `Purchase` est en écriture seule : aucun `update`, aucun `delete`.
- Le solde est calculé, jamais stocké.

## Architecture

- `core/` n'importe ni React, ni Next, ni Prisma, ni Solana.
- `prisma.` n'apparaît que dans `lib/db/` et `prisma.ts`.
- Aucun composant ne calcule un montant.
- Aucune valeur métier hors de `config/project.ts`.
- Aucune couleur en dur dans le JSX : uniquement les variables CSS du thème.
- Le logo n'est référencé que dans `components/shared/brand-logo.tsx`.
- Fichiers en kebab-case, un composant par fichier, export par défaut.
- Aucun bloc `catch` vide.

## Commandes

npm run dev · build · start · lint · typecheck · test · reconcile

# Plan de construction — Private Sale Solana

Document destiné à un agent IA travaillant dans VS Code.

---

## Comment utiliser ce document

Tu es un développeur full-stack senior, spécialisé Next.js et Solana. Tu construis cette application en suivant les étapes ci-dessous **dans l'ordre**, sans en sauter aucune.

Règles de travail :

1. **Une étape à la fois.** À la fin de chaque étape, arrête-toi, montre les fichiers créés, et attends ma validation avant de continuer.
2. **Ne code rien qui ne soit pas demandé.** Si tu penses qu'un ajout est nécessaire, propose-le, ne l'implémente pas.
3. **En cas d'ambiguïté, pose la question.** Ne devine jamais une valeur métier.
4. Chaque étape a un **critère de validation**. Vérifie-le avant de me rendre la main.
5. Ne modifie jamais un fichier d'une étape précédente sans me le signaler.

---

## Paramètres du projet

> À remplir avant de lancer l'agent. Ce sont les seules valeurs qui changent d'un projet à l'autre.

| Clé                                     | Valeur                                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom du projet                           | `Uptober Crash`                                                                                                                                     |
| Nom du token                            | `Uptober Crash`                                                                                                                                     |
| Symbole                                 | `UP`                                                                                                                                                |
| Décimales du token                      | `9`                                                                                                                                                 |
| Taux : 1 SOL = N tokens                 | `100`                                                                                                                                               |
| Achat minimum (SOL)                     | `0.5`                                                                                                                                               |
| Achat maximum (SOL, optionnel)          | `null`                                                                                                                                              |
| Commission d'affiliation (%)            | `10`                                                                                                                                                |
| Date de fin de vente (ISO)              | `2026-10-01T00:00:00Z`                                                                                                                              |
| URL du site principal                   | `https://uotobercrash.com`                                                                                                                          |
| URL de l'app                            | `https://privatesale.uotobercrash.com`                                                                                                              |
| Couleur de fond                         | `#0E8F5F`                                                                                                                                           |
| Couleur d'accent                        | `#C5F57D`                                                                                                                                           |
| Couleur de surface (cartes)             | `#040612`                                                                                                                                           |
| Thème                                   | `dark`                                                                                                                                              |
| Police (fichiers .woff2 fournis)        | `Dela Gothic One pour les titres et DM Sans pour les paragraphs, il faut déplacer uniquement  les fonts utilisé dans le bon dossier dans le projet ` |
| Logo (fichier fourni dans /docs/public) | `Il fuat les déplacer dans le dossier public quand il sera créé                                                                                     |
| `                                       |

---

## Décisions d'architecture

Ces décisions sont prises. Ne les remets pas en cause.

### 1. La blockchain est la source de vérité

La base de données est un **index** de ce qui existe sur la chaîne, pas la vérité. Conséquence testable : on doit pouvoir reconstruire toute la table des achats à partir de la seule adresse de trésorerie. Un script fait exactement ça (étape 11).

Corollaire : la table des achats est en **écriture seule**. Aucun `UPDATE`, aucun `DELETE`, jamais.

### 2. Le serveur ne fait jamais confiance à un montant envoyé par le client

Le client envoie une signature de transaction. Le serveur la lit sur la chaîne et en extrait lui-même le montant, l'expéditeur et le destinataire. Tout montant présent dans le corps d'une requête est ignoré.

### 3. Route handlers, pas server actions, pour les écritures

Les écritures passent par `POST /api/...`. Une server action ressemble à un appel de fonction locale, ce qui pousse à lui faire confiance ; un route handler se lit comme ce qu'il est : une porte ouverte sur Internet. Les server actions restent autorisées pour les lectures d'affichage.

### 4. Les montants sont des entiers en unités de base

En base et dans tout le code serveur, on stocke des **lamports** (`BigInt`) et des **unités de base de token** (`BigInt`). Jamais de nombre à virgule flottante, jamais de `parseFloat`, jamais de `Math.pow`. La conversion en unités lisibles se fait uniquement à l'affichage, dans un helper unique.

### 5. Pas de logique métier dans `app/`

Aucun composant React, aucune page, aucun route handler ne calcule un montant. Tous les calculs vivent dans `core/`, qui est du TypeScript pur sans dépendance à React ni à Next.

### 6. Pas de clé privée côté serveur

Cette application ne signe rien. La trésorerie est une simple adresse de réception. Aucune variable d'environnement ne doit contenir de clé privée.

---

## Stack

> Versions vérifiées sur le registre npm le 1er septembre 2026. Installe les
> versions courantes ; ne descends pas en dessous des majeures indiquées.

| Paquet                         | Majeure imposée | Version au 01/09/2026 |
| ------------------------------ | --------------- | --------------------- |
| `next`                         | 16              | 16.3.4                |
| `react` / `react-dom`          | 19              | 19.2.8                |
| `@prisma/client` / `prisma`    | 7               | 7.10.0                |
| `tailwindcss`                  | 4               | 4.3.3                 |
| `zod`                          | 4               | 4.5.4                 |
| `@dynamic-labs/sdk-react-core` | 5               | 5.6.1                 |
| `@solana/web3.js`              | 1               | 1.98.4                |
| `lucide-react`                 | 1               | 1.39.0                |
| `eslint`                       | 10              | 10.9.1                |
| `vitest`                       | 4               | 4.1.11                |
| `typescript`                   | 5.9             | 5.9.3                 |
| `@dynamic-labs/solana`         | 5               | 5.6.1                 |
| `@prisma/adapter-pg`           | 7               | 7.10.0                |
| `@prisma/config`               | 7               | 7.10.0                |
| `@next/eslint-plugin-next`     | 16              | 16.3.4                |
| `typescript-eslint`            | 8               | 8.69.0                |
| `tsx`                          | 4               | 4.23.13               |

Détails et pièges :

- **Next.js 16 est l'Active LTS.** Next.js 15 est en Maintenance LTS avec fin de
  support au 21 octobre 2026 : ne démarre pas dessus.
- **Node.js 20.12 minimum**, TypeScript 5.1 minimum. Vérifie `node -v` avant tout.
  Le plancher n'est pas 20.9 : `prisma.config.ts` et `scripts/load-env.ts`
  appellent `process.loadEnvFile()`, arrivée en 20.12. Sous cette version, le
  déploiement échoue sur un `process.loadEnvFile is not a function` qui ne dit
  rien de sa vraie cause.
- **Turbopack est le défaut** dans Next 16. Le drapeau `--turbopack` est inutile.
- **`next lint` n'existe plus.** Utilise l'ESLint CLI directement. `next build`
  ne lance plus le lint : c'est une étape séparée.
- **ESLint 10 impose le Flat Config** (`eslint.config.mjs`). Pas de `.eslintrc`.
- **Prisma 7**, pas 6. Prisma 8 est en release candidate : ne l'utilise pas.
- **zod 4**, dont l'API de gestion d'erreurs diffère de la v3. Ne recopie pas des
  exemples v3 trouvés dans tes données d'entraînement.
- **`@solana/web3.js` en 1.x.** Le successeur `@solana/kit` existe, mais le SDK
  Dynamic s'appuie sur la 1.x : ne mélange pas les deux.
- **TypeScript 5.9, pas 7.** La 7.x est publiée sous le tag `latest`, mais
  `typescript-eslint` la refuse explicitement (« does not support TS 7.0 »,
  support attendu pour TS ≥ 7.1). Le repli sur 5.9.3 n'est pas un choix de
  confort : sans lui `npm run lint` ne démarre pas. À réévaluer quand
  `typescript-eslint` rattrapera.
- **`eslint-config-next` n'est pas utilisable avec ESLint 10.** Il embarque une
  version d'`eslint-plugin-react` qui appelle `context.getFilename()`, supprimé
  dans ESLint 10. Ne l'installe pas : branche `@next/eslint-plugin-next`
  directement, avec `typescript-eslint` pour le parsing.
- **`@dynamic-labs/solana` est obligatoire.** `SolanaWalletConnectors` n'existe
  dans aucun autre paquet Dynamic.
- **Prisma 7 exige un adaptateur de pilote.** `new PrismaClient()` sans `adapter`
  refuse de se connecter : il faut `@prisma/adapter-pg`. Et `@prisma/config`,
  qu'importe `prisma.config.ts`.
- **Cinq copies imbriquées de `@solana/web3.js`** arrivent avec le SDK Dynamic,
  en 1.98.1. Elles produisent des types `Transaction` nominalement incompatibles
  et doublent le poids du bundle client. À effondrer par un `overrides` dans
  `package.json` :

  ```json
  "overrides": { "@solana/web3.js": "$@solana/web3.js" }
  ```

- **npm 11.19 bloque les scripts d'installation.** Quatre sont nécessaires —
  `@prisma/engines`, `prisma`, `esbuild`, `unrs-resolver` — et s'autorisent par
  `npm install-scripts approve <pkg>`, qui les inscrit dans le champ
  `allowScripts` de `package.json`. Sans eux, `prisma generate` échoue en
  production.
- **shadcn/ui** sur Radix — uniquement `button`, `input`, `label`, `separator`,
  `drawer`, `sonner`.
- Tailwind v4 via `@tailwindcss/postcss`, sans fichier `tailwind.config`.

Toute dépendance importée doit figurer dans `package.json`. N'utilise jamais un paquet résolu par transitivité.

**Ne te fie pas à ta mémoire pour les API de Next.js.** Next 16 comporte des
changements cassants par rapport à 15 : `params` et `searchParams` sont
strictement asynchrones, `middleware` est renommé `proxy`, `serverRuntimeConfig`
et `publicRuntimeConfig` sont supprimés. La documentation de la version
installée est fournie dans `node_modules/next/dist/docs/`. Consulte-la plutôt
que de reproduire un motif d'une version antérieure.

**Repli MySQL** — si PostgreSQL est finalement écarté, toutes les colonnes contenant une adresse ou une signature doivent être déclarées en collation binaire (`@db.VarChar(88)` + `COLLATE utf8mb4_bin` dans la migration). Le base58 est sensible à la casse ; une collation `_ci` provoque des collisions d'unicité et des lectures erronées.

---

## Arborescence cible

```
core/                       # TypeScript pur, aucun import React ou Next
  money.ts
  rules.ts
  affiliate.ts
  errors.ts
  core.test.ts
config/
  project.ts                # valeurs métier
  env.ts                    # validation des variables d'environnement
lib/
  solana/
    connection.ts
    verify-purchase.ts
  db/
    purchase.ts
    affiliate.ts
  format.ts                 # unités de base -> affichage
  utils.ts                  # cn()
  http.ts                   # codes d'erreur -> statuts HTTP, enveloppe Result
  rate-limit.ts             # limitation de débit, extraction de l'IP client
  monitoring.ts             # journalisation structurée et alertes
  providers.tsx             # DynamicContextProvider
app/
  layout.tsx
  page.tsx
  globals.css
  fonts.ts
  api/
    purchases/route.ts
    affiliate/route.ts
  actions/
    read.ts                 # lectures d'affichage
components/
  sale/
    sale-card.tsx
    balance.tsx
    sol-input.tsx
    token-output.tsx
    buy-button.tsx
  affiliate/
    affiliate-drawer.tsx
  shared/
    site-header.tsx
    site-footer.tsx
    connect-button.tsx
    disconnect-button.tsx
    countdown.tsx
    copy-button.tsx
    brand-logo.tsx            # seul fichier référençant le logo du projet
    solana-mark.tsx           # seul fichier référençant le logo Solana
    sale-paused-banner.tsx
  ui/
context/
  sale-provider.tsx
scripts/
  reconcile.ts
  load-env.ts               # charge .env avant tout autre import
prisma/
  schema.prisma
prisma.ts
prisma.config.ts            # imposé par Prisma 7 : porte l'URL de connexion
vitest.config.mts           # alias @/ ; .mts car tsx charge les .ts en CJS
```

Nommage : **kebab-case pour tous les fichiers**. Un composant par fichier, export par défaut.

---

# Étape 0 — Initialisation

## Objectif

Un projet vide qui compile.

## Actions

1. Vérifier `node -v` ≥ 20.12. Sinon, s'arrêter et me le signaler.
2. `npx create-next-app@latest` : TypeScript oui, Tailwind oui, App Router oui, `src/` **non**, alias d'import `@/*` oui. Vérifier que `next` installé est bien en 16.x.
3. **Mettre en place la documentation d'agent** : le drapeau `--agents-md` de `create-next-app` s'en charge nativement, le codemod n'est plus nécessaire. Cela crée un `AGENTS.md` pointant vers `node_modules/next/dist/docs/`, c'est-à-dire la documentation de la version exactement installée. Lis-la avant d'écrire du code Next.
4. Supprimer tout le contenu de démonstration : le `page.tsx` par défaut, les SVG de `/public`, le CSS d'exemple dans `globals.css`.
5. Installer les dépendances listées dans la section Stack. npm 11.19 bloquant les scripts d'installation, autoriser les quatre nécessaires : `npm install-scripts approve @prisma/engines prisma esbuild unrs-resolver`, puis relancer `npm install`. Sans quoi Prisma n'aura pas ses binaires.
6. Initialiser shadcn (`npx shadcn@latest init`) et ajouter uniquement les six composants listés.
7. `tsconfig.json` : `"strict": true`, `"noUncheckedIndexedAccess": true`, et `"target": "ES2022"`. `create-next-app` écrit `ES2017`, sous lequel TypeScript **interdit les littéraux `BigInt`** — soit tout le socle des montants.
8. **ESLint en Flat Config** : créer `eslint.config.mjs` important `@next/eslint-plugin-next` directement, plus `typescript-eslint` pour le parsing. **Ne pas utiliser `eslint-config-next`** : il embarque un `eslint-plugin-react` incompatible avec ESLint 10 et fait planter le lint au démarrage. Ne crée pas de `.eslintrc*`. Ne mets pas de clé `eslint` dans `next.config.ts` : l'option a été supprimée.
9. Créer `.env.example` et `.gitignore` (vérifier que `.env*` y figure, **et ajouter `!.env.example`** — sans quoi le modèle lui-même serait ignoré et ne partirait jamais dans le dépôt).
10. **Épingler la version de Node** : champ `engines` dans `package.json` et fichier `.node-version`. Sans cela, le constructeur d'images choisit tout seul, et rien ne garantit qu'il retienne une version ≥ 20.12.
11. Scripts `package.json` :

```json
"dev": "next dev",
"build": "next build",
"build:deploy": "prisma generate && prisma migrate deploy && next build",
"start": "next start",
"lint": "eslint .",
"typecheck": "tsc --noEmit",
"test": "vitest run",
"reconcile": "tsx scripts/reconcile.ts"
```

Pas de `--turbopack` : c'est le défaut en Next 16. Pas de `next lint` : la commande a été supprimée.

## Critère de validation

`npm run build`, `npm run lint` et `npm run typecheck` passent tous les trois. `AGENTS.md` existe et pointe vers les docs embarquées. Aucun fichier de démonstration ne subsiste.

---

# Étape 1 — Configuration et environnement

## Objectif

Une source de vérité unique pour les valeurs métier, et une validation d'environnement qui échoue tôt et clairement.

## Fichiers

**`config/project.ts`** — reprend le tableau de paramètres. Tout est `as const`.

```ts
export const PROJECT = {
  name: '...',
  tokenName: '...',
  tokenSymbol: '...',
  tokenDecimals: 9,
  homeUrl: '...',
  appUrl: '...',
} as const;

export const SALE = {
  tokensPerSol: 0n, // BigInt
  minLamports: 0n,
  maxLamports: null as bigint | null,
  endsAt: new Date('...'),
} as const;

export const AFFILIATE = {
  commissionBasisPoints: 0, // 1000 = 10 %
} as const;
```

Le taux et les seuils sont des `BigInt` en unités de base, pas des nombres décimaux. La commission est en points de base (entier), pas en pourcentage flottant.

**`config/env.ts`** — schéma zod validé **une seule fois à l'import du module**, exportant un objet typé. Variables attendues :

```
DATABASE_URL                  obligatoire
SOLANA_RPC_URL                obligatoire
NEXT_PUBLIC_DYNAMIC_ENV_ID    obligatoire
NEXT_PUBLIC_TREASURY_ADDRESS  obligatoire
SALE_PAUSED                   optionnelle, défaut false   (étape 12)
ALERT_WEBHOOK_URL             optionnelle                 (étape 12)
TRUSTED_PROXY_HOPS            optionnelle, défaut 1       (étape 12)
```

Si une variable manque, le module lève une erreur au démarrage du serveur avec un message nommant explicitement la variable. **Ne jamais lever d'erreur pendant le rendu d'un composant** : une variable absente ne doit pas produire une page blanche.

Séparer clairement les variables publiques (`NEXT_PUBLIC_*`) des variables serveur, dans deux objets distincts.

Trois pièges, tous rencontrés :

- Une variable **présente mais vide** — ce que produit un `.env.example` recopié tel quel — n'est pas `undefined`. Sans normalisation, `ALERT_WEBHOOK_URL=` fait échouer le démarrage alors qu'elle est facultative.
- L'objet des variables serveur ne doit **pas** être évalué dans le navigateur. Un composant client important la configuration publique chargerait le même module ; y valider `DATABASE_URL`, absente côté navigateur, produirait exactement la page blanche que cette étape interdit.
- Chaque `process.env.NEXT_PUBLIC_*` doit être référencé **littéralement**. Un accès dynamique n'est pas remplacé à la compilation, et la valeur sera `undefined` en production.

## Règles

- Aucune valeur métier ne doit apparaître ailleurs que dans `config/project.ts`. Ni dans un composant, ni dans un texte d'interface, ni dans un commentaire.
- Aucune clé privée dans les variables d'environnement de ce projet.

## Critère de validation

Supprimer une variable de `.env` fait échouer le démarrage avec un message explicite, pas une erreur cryptique de `undefined`.

---

# Étape 2 — Le cœur métier et ses tests

## Objectif

Toute la logique de calcul, isolée, testée, sans aucune dépendance au framework.

## Fichiers

**`core/money.ts`**

- `solToLamports(value: string): bigint` — parse une chaîne décimale saisie par l'utilisateur sans passer par `Number`. Découpe sur le point, complète à 9 décimales, concatène, convertit en `BigInt`. Rejette plus de 9 décimales.
- `lamportsToSol(v: bigint): string` — formatage pour affichage.
- `baseUnitsToDisplay(v: bigint, decimals: number): string`
- `formatCompact(v: bigint, decimals: number): string` — pour les grands nombres de tokens.

**`core/rules.ts`**

- `tokensForLamports(lamports: bigint): bigint` — applique `SALE.tokensPerSol`.
- `isAmountValid(lamports: bigint): { ok: true } | { ok: false; reason: string }` — vérifie minimum et maximum.
- `isSaleOpen(now: Date): boolean`
- `commissionFor(lamports: bigint): bigint` — applique les points de base par multiplication puis division entière, dans cet ordre.

**`core/affiliate.ts`**

- `deriveAffiliateCode(walletAddress: string): string` — SHA-256 de l'adresse, 8 premiers caractères hexadécimaux. **Déterministe** : la même adresse produit toujours le même code.
- `isValidAffiliateCodeFormat(code: string): boolean`

**`core/errors.ts`** — un type de résultat discriminé utilisé partout :

```ts
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };
```

Les codes d'erreur sont une union de littéraux, pas des chaînes libres.

**`core/core.test.ts`** — au minimum ces cas :

- `solToLamports('0.5')` vaut `500000000n`
- `solToLamports('1')` vaut `1000000000n`
- `solToLamports('0.0000000001')` est rejeté (10 décimales)
- `solToLamports('1.5.2')` et `solToLamports('abc')` sont rejetés
- `tokensForLamports` sur un très grand montant (10 millions de tokens) reste exact — c'est le test qui attrape le dépassement de `Number.MAX_SAFE_INTEGER`
- `commissionFor` sur un montant produisant une division non entière arrondit vers le bas, sans perte de précision
- `deriveAffiliateCode` appelé deux fois sur la même adresse renvoie la même valeur

## Règles

- Aucun `import` de React, Next, Prisma ou Solana dans `core/`.
- Aucun `Number`, `parseFloat` ou `Math.pow` sur un montant.

## Critère de validation

`npm run test` passe. `core/` ne contient aucune importation de framework.

---

# Étape 3 — Schéma de base de données

## Objectif

Un schéma qui rend les bugs de tes projets précédents structurellement impossibles.

## `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Purchase {
  id             String   @id @default(cuid())
  walletAddress  String
  lamports       BigInt
  tokenBaseUnits BigInt
  tokensPerSol   BigInt
  txHash         String   @unique
  slot           BigInt
  blockTime      DateTime
  affiliateCode  String?
  affiliate      Affiliate? @relation(fields: [affiliateCode], references: [code], onDelete: Restrict, onUpdate: Restrict)
  createdAt      DateTime @default(now())

  @@index([walletAddress])
  @@index([affiliateCode])
}

model Affiliate {
  code          String     @id
  walletAddress String     @unique
  createdAt     DateTime   @default(now())
  purchases     Purchase[]
}
```

## Points de conception à respecter

- **`Purchase` est immuable.** Aucune fonction du code ne doit contenir `purchase.update` ou `purchase.delete`. Et la clé étrangère doit être en **`Restrict` des deux côtés** : le défaut de Prisma est `onDelete: SetNull, onUpdate: Cascade`, ce qui laisse la base réécrire elle-même des lignes d'achat quand un affilié est supprimé ou renommé. C'est un chemin d'écriture vers une table close, invisible à toute recherche dans le code.
- `txHash @unique` : la contrainte d'unicité en base est le rempart final contre le rejeu. Elle ne remplace pas la vérification applicative, elle la double.
- `tokensPerSol` est stocké **sur chaque achat**. Le taux peut changer entre deux phases ; un achat doit rester interprétable avec le taux qui s'appliquait au moment où il a eu lieu.
- `slot` et `blockTime` viennent de la chaîne. Ils permettent au script de réconciliation de repartir d'un point connu.
- La commission d'affiliation **n'est pas stockée**. C'est un calcul dérivé de `lamports` et de la configuration. Une valeur stockée est une valeur qui peut diverger.

**Prisma 7 refuse `url` dans le schéma.** La chaîne de connexion vit désormais dans `prisma.config.ts`, à la racine :

```ts
import { defineConfig, env } from '@prisma/config';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL') },
});
```

Prisma 7 ne charge plus `.env` tout seul non plus : le faire dans ce fichier, avec `process.loadEnvFile()`, natif depuis Node 20.12 — et sous condition d'existence, le fichier étant absent en production.

Générer la migration initiale. Le drapeau de `migrate diff` s'appelle `--to-schema`, plus `--to-schema-datamodel`.

## Critère de validation

`npx prisma migrate dev` s'exécute. Aucune colonne de type texte ne contient de montant.

---

# Étape 4 — Couche de vérification on-chain

## Objectif

La fonction qui lit une transaction sur la chaîne et décide si elle constitue un achat valide.

## Fichiers

**`lib/solana/connection.ts`** — une instance `Connection` unique, en commitment `confirmed`, construite depuis `env.SOLANA_RPC_URL`.

**`lib/solana/verify-purchase.ts`**

```ts
export async function verifyPurchase(
  txHash: string,
): Promise<Result<VerifiedPurchase>>;
```

Étapes, dans cet ordre, avec un code d'erreur distinct à chaque échec :

1. Valider le format de la signature (base58, longueur plausible).
2. `getParsedTransaction(txHash, { maxSupportedTransactionVersion: 0 })`. Si `null` → `TX_NOT_FOUND`.
3. Si `meta.err` est non nul → `TX_FAILED`.
4. Parcourir les instructions, trouver un transfert `system` dont `destination` est exactement `env.TREASURY_ADDRESS`. Absent → `NO_TRANSFER_TO_TREASURY`.
5. Extraire `lamports` et `source` **depuis la transaction**, jamais depuis la requête.
6. Extraire `slot` et `blockTime`.
7. Retourner `{ walletAddress, lamports, slot, blockTime }`.

Ne fais confiance à aucune valeur venant de l'appelant, sauf la signature elle-même.

Prévoir un retry simple (trois tentatives, délai croissant) sur les erreurs réseau du RPC, mais **jamais** de retry sur une transaction introuvable — une signature inconnue reste inconnue.

## Critère de validation

Appelée avec une signature aléatoire, la fonction retourne `TX_NOT_FOUND` sans lever d'exception. Appelée avec une signature réelle de devnet vers une autre adresse, elle retourne `NO_TRANSFER_TO_TREASURY`.

---

# Étape 5 — Couche base de données

## Objectif

Isoler tous les accès Prisma. Aucun autre fichier n'importe `prisma` directement.

## Fichiers

**`prisma.ts`** — singleton habituel avec cache sur `globalThis` en développement. **Prisma 7 impose un adaptateur de pilote** : `new PrismaClient({ adapter: new PrismaPg({ connectionString: … }) })`, faute de quoi le client refuse de se connecter.

**`lib/db/purchase.ts`**

- `insertPurchase(data)` — capture l'erreur d'unicité Prisma `P2002` et la traduit en `Result` avec le code `ALREADY_RECORDED`, plutôt que de laisser remonter une exception.
- `findPurchaseByTxHash(txHash)`
- `getWalletTotals(walletAddress)` — retourne `{ totalLamports: bigint, totalTokens: bigint }`, calculé par agrégation SQL, pas en additionnant en JavaScript.
- `getLatestSlot()` — pour le script de réconciliation.

**`lib/db/affiliate.ts`**

- `getAffiliateByWallet(walletAddress)`
- `getAffiliateByCode(code)`
- `createAffiliate(walletAddress)` — utilise `deriveAffiliateCode`, en `upsert` pour être idempotent.
- `getAffiliateStats(code)` — retourne le nombre d'achats et le total de lamports parrainés, par agrégation SQL. La commission est calculée ensuite par `core/rules.ts`.

## Règles

- Aucun `update` ni `delete` sur `Purchase`.
- Les agrégations se font en SQL. Ne charge jamais toutes les lignes pour les additionner en mémoire.

## Critère de validation

Une recherche de `prisma.` dans le projet ne renvoie que des résultats dans `lib/db/` et `prisma.ts`.

---

# Étape 6 — Routes API

## Objectif

Les deux seuls points d'écriture de l'application.

## `POST /api/purchases`

Corps accepté — **rien d'autre** :

```json
{ "txHash": "string", "affiliateCode": "string | null" }
```

Séquence :

1. Valider le corps avec zod. Corps invalide → `400`.
2. Vérifier que la vente est ouverte (`isSaleOpen`). Fermée → `403`.
3. `findPurchaseByTxHash` → si trouvé, retourner `200` avec l'achat existant (idempotence : un double envoi ne doit pas produire d'erreur).
4. `verifyPurchase(txHash)` → si échec, retourner le code d'erreur avec un statut approprié.
5. `isAmountValid(lamports)` → montant hors bornes → `400`.
6. Si `affiliateCode` est fourni : le résoudre en base. S'il est introuvable, l'ignorer silencieusement (ne pas rejeter l'achat). **S'il appartient à l'acheteur lui-même, l'ignorer** — on ne se parraine pas soi-même.
7. `tokensForLamports(lamports)` calculé côté serveur.
8. `insertPurchase`.
9. Retourner `201` avec le montant en tokens.

Le montant, l'adresse de l'acheteur et le destinataire ne viennent jamais du corps de la requête. Ils sont extraits de la chaîne à l'étape 4.

Ajouter une limitation de débit simple en mémoire : dix requêtes par minute et par IP. Sur une instance unique — un conteneur Coolify en est une — une `Map` suffit ; pas besoin de Redis. Elle ne survit pas à un redémarrage et ne se partage pas entre processus : c'est assumé, le but est de freiner un script, pas de tenir un quota comptable.

Attention à l'extraction de l'IP : `request.ip` n'existe plus en Next 16, et `X-Forwarded-For` est une **liste** à laquelle les proxys ajoutent leur vision de l'appelant sans effacer ce qui précède. Le début de la liste est écrit par le client. Voir `TRUSTED_PROXY_HOPS` à l'étape 12.

## `POST /api/affiliate`

Corps : `{ "walletAddress": "string" }`.

1. Valider l'adresse.
2. Vérifier que ce wallet a **au moins un achat** enregistré. Sinon → `403`.
3. `createAffiliate` (idempotent).
4. Retourner le code.

## Lectures — `app/actions/read.ts`

Server actions, en lecture seule, pour l'affichage :

- `getBalance(walletAddress)`
- `getAffiliateState(walletAddress)`

Ces fonctions ne modifient rien et ne prennent aucune décision métier.

## Règles communes

- Toutes les réponses suivent le type `Result` de `core/errors.ts`.
- Aucun bloc `catch` vide. Aucun `console.log(error)` seul : toute erreur est journalisée avec son contexte et retournée avec un code.
- Sérialiser les `BigInt` explicitement en chaîne dans les réponses JSON — `JSON.stringify` ne sait pas les traiter.
- La correspondance code d'erreur → statut HTTP et l'enveloppe `Result` vivent dans `lib/http.ts`, partagés par les deux routes. La table doit être un `Record<ErrorCode, number>` **exhaustif** : ajouter un code sans lui donner de statut casse alors la compilation, plutôt que de partir silencieusement en 200.
- La limitation de débit et l'extraction de l'IP client vivent dans `lib/rate-limit.ts`, et s'appliquent aux **deux** routes d'écriture.
- Envelopper chaque route dans un `try/catch` de dernier recours : une exception inattendue doit sortir en `Result` journalisé, pas en trace Next brute.
- L'union `ErrorCode` grandit au fil des étapes. C'est normal ; ce qui ne l'est pas, c'est un message d'erreur en chaîne libre.

## Critère de validation

Un appel à `POST /api/purchases` avec un `txHash` fabriqué retourne une erreur propre. Un appel avec un montant dans le corps voit ce champ purement ignoré.

---

# Étape 7 — Providers et état client

## Objectif

La connexion wallet et l'état partagé du formulaire.

## Fichiers

**`lib/providers.tsx`** — `DynamicContextProvider` avec :

- `environmentId` depuis la configuration publique
- `walletConnectors: [SolanaWalletConnectors]`
- `initialAuthenticationMode: 'connect-only'`
- `mobileExperience: 'in-app-browser'` — indispensable, la majorité du trafic arrive depuis Telegram ou X sur mobile
- `recommendedWallets`: Phantom et Solflare
- `theme` aligné sur le thème du projet

**`context/sale-provider.tsx`** — un contexte unique contenant :

```ts
{
  solInput: string;
  setSolInput: (v: string) => void;
  lamports: bigint;          // dérivé, jamais saisi
  tokenAmount: bigint;       // dérivé
  inputError: string | null; // dérivé
  affiliateCode: string | null;
  refreshBalance: () => void;
}
```

Le champ saisi est une chaîne. Les valeurs dérivées sont calculées par `core/`, pas dans le composant. Ne stocke jamais un montant sous forme de nombre dans l'état.

Le code d'affiliation est lu **une fois** depuis `?code=` au montage, puis conservé dans le contexte. Ne le relis pas depuis l'URL au moment de l'achat.

## Critère de validation

Aucun composant ne contient de calcul arithmétique sur un montant.

---

# Étape 8 — Système de design

## Objectif

Un thème entièrement pilotable, pour que le prochain projet ne soit qu'un changement de variables.

## `app/globals.css`

Un seul jeu de variables sous `:root`. Pas de bloc `.dark` : le thème est fixé par la configuration du projet.

```css
:root {
  --background: ...;
  --foreground: ...;
  --card: ...;
  --card-foreground: ...;
  --accent: ...;
  --accent-foreground: ...;
  --muted: ...;
  --muted-foreground: ...;
  --border: ...;
  --destructive: ...;
  --success: ...;
  --radius: ...;
}
```

Ajouter les utilitaires de confort utilisés dans la maquette (`flex-center`).

## `app/fonts.ts`

Polices locales `.woff2` via `next/font/local`, avec `display: 'swap'`, `preload: true`, une variable CSS et une pile de repli système.

## `components/shared/brand-logo.tsx`

Le **seul** fichier du projet référençant l'image du logo. Accepte une prop `className` pour la taille. Tout affichage du logo passe par ce composant.

## Règles

- **Aucune couleur en dur dans le JSX.** Pas de `bg-neutral-900`, pas de `text-white`, pas de `border-neutral-700`. Uniquement `bg-background`, `text-foreground`, `bg-accent`, `border-border`, etc.
- Aucun chemin d'image en dur en dehors de `brand-logo.tsx`.
- Deux graisses de police au maximum.

## Critère de validation

Changer les quatre variables de couleur dans `globals.css` rethème toute l'application, sans toucher à un seul composant. C'est le test à exécuter avant de valider cette étape.

---

# Étape 9 — Composants d'interface

## Objectif

Les briques visuelles. Aucune ne contient de logique métier.

## Composants partagés

**`site-header.tsx`** — hauteur 80 px, fond `--card`. À gauche : `BrandLogo` et le nom du projet, en lien vers `PROJECT.homeUrl`. À droite : une flèche gauche et « Back to Home ». Conteneur centré, marge horizontale sur mobile.

**`site-footer.tsx`** — hauteur 48 px, mention de copyright avec le nom du projet et l'année courante.

**`connect-button.tsx`** — visible uniquement hors connexion. Déclenche `setShowAuthFlow(true)`. Désactivé tant que `sdkHasLoaded` est faux.

**`disconnect-button.tsx`** — visible uniquement connecté. Discret, en variante `ghost`.

**`countdown.tsx`** — reçoit une `Date`. Affiche jours, heures, minutes, secondes. Utilise `suppressHydrationWarning` sur les valeurs. Nettoie son `setInterval` au démontage. **Gère explicitement l'état terminé** : quand la date est dépassée, affiche « Sale ended » plutôt que quatre zéros.

**`copy-button.tsx`** — copie une chaîne, bascule l'icône vers une coche pendant deux secondes.

## Composants de vente

**`balance.tsx`** — hauteur 48 px, bordure fine. Affiche « Your balance » et le total de tokens déjà achetés, avec la pastille du logo. Trois états distincts : chargement (squelette), zéro, valeur. Ne jamais afficher `0` pendant le chargement — c'est trompeur.

**`sol-input.tsx`** — hauteur 96 px, fond `--card`, coins arrondis.

- En haut à gauche : « You pay ». En haut à droite : `1 SOL = {taux}` avec la pastille du token. **Le taux est lu depuis la configuration**, jamais écrit en dur.
- Champ `type="number"`, `inputMode="decimal"`, flèches natives masquées, taille de police très grande.
- Filtre de saisie par expression régulière : chiffres, un point, quatre décimales maximum.
- Message d'erreur en 11 px sous le champ, en `--destructive`, avec une hauteur réservée pour éviter que la mise en page ne saute à l'apparition du message.
- Pastille du logo Solana à droite. Ce logo n'est pas celui du projet : il vit dans `components/shared/solana-mark.tsx`, distinct de `brand-logo.tsx`. La règle « une image, un seul point de référence » vaut pour chacun des deux.
- Désactivé tant que le wallet n'est pas connecté.

**`token-output.tsx`** — même gabarit, non éditable. « You get » et le montant formaté. Au-delà d'un million, utiliser le format compact.

Entre les deux champs, un bouton circulaire contenant une flèche vers le bas, positionné en absolu au centre.

**`buy-button.tsx`** — le seul composant orchestrant une transaction. Le détail de sa logique est à l'étape 10.

## Composant d'affiliation

**`affiliate-drawer.tsx`** — un `Drawer` Radix déclenché par un bouton pleine largeur affichant le pourcentage de commission.

Trois états mutuellement exclusifs :

- Wallet sans achat : message expliquant qu'il faut avoir participé
- Wallet avec achat mais sans code : bouton « Request affiliate link »
- Code existant : le lien complet, un bouton de copie, et deux cartes chiffrées (« Link used », « SOL earned »)

Les statistiques ne sont rafraîchies **que lorsque le tiroir est ouvert**, toutes les dix secondes, avec nettoyage de l'intervalle à la fermeture.

## Règles pour tous les composants

- Chaque état asynchrone a une représentation visuelle : chargement, vide, erreur, succès. Ne laisse jamais une zone vide sans explication.
- Tout bouton déclenchant une action réseau se désactive pendant l'exécution et affiche un libellé indiquant l'étape en cours.
- Les libellés sont en anglais.
- Les icônes décoratives portent `aria-hidden`. Les boutons sans texte portent un `aria-label`.
- La carte fait 384 px de large sur grand écran et occupe la largeur disponible moins une marge sur mobile.

## Critère de validation

Chaque composant se rend correctement sans wallet connecté, sans planter et sans zone vide inexpliquée.

---

# Étape 10 — Page et flux d'achat

## Objectif

Assembler, et implémenter le parcours complet.

## `app/page.tsx`

Structure : `main` en pleine hauteur, colonne, avec `site-header`, la carte centrée, `site-footer`.

Contenu de la carte, de haut en bas : logo et nom du projet, mention « Private Sale » en petites capitales espacées, compte à rebours, `balance`, `sol-input` et `token-output` séparés par le bouton fléché, `connect-button`, `buy-button`, `affiliate-drawer`, `disconnect-button`.

## `app/layout.tsx`

Métadonnées (titre, description, Open Graph), police appliquée sur `html`, `Providers` autour des enfants, `Toaster` de sonner en position haute et centrée.

## Flux du bouton d'achat

État du libellé : `Buy Tokens` → `Signing` → `Sending` → `Confirming` → retour.

1. Vérifier la connexion et la validité du montant. Si la vente est fermée, le bouton est désactivé.
2. Construire une `Transaction` avec un unique `SystemProgram.transfer` vers `NEXT_PUBLIC_TREASURY_ADDRESS`, pour `lamports` pris depuis le contexte.
3. `recentBlockhash` fraîchement récupéré, `feePayer` = utilisateur.
4. Faire signer par le wallet, envoyer via `sendRawTransaction`.
5. Attendre la confirmation : **première vérification immédiate**, puis toutes les 2 secondes, jusqu'à 60 secondes. Ne commence pas par attendre.
6. Trois issues distinctes, avec trois messages différents :
   - Confirmée → appeler `POST /api/purchases` avec la signature et le code d'affiliation, puis toast de succès et rafraîchissement du solde
   - Erreur explicite renvoyée par la chaîne → toast d'échec
   - Délai dépassé sans erreur → toast d'avertissement indiquant que la transaction est peut-être passée, invitant à rafraîchir plutôt qu'à réessayer. **Ne pas traiter un timeout comme un échec** : c'est la cause principale des doubles paiements.
7. Si l'appel à l'API échoue alors que la transaction est confirmée, afficher un message demandant de rafraîchir, et journaliser la signature. Le script de réconciliation rattrapera le cas.

Le composant ne calcule aucun montant : il lit `lamports` dans le contexte et transmet la signature à l'API.

## Critère de validation

Le parcours complet fonctionne sur devnet. Fermer l'onglet juste après la signature ne provoque aucune corruption : l'achat est simplement absent de la base, et récupérable par réconciliation.

---

# Étape 11 — Script de réconciliation

## Objectif

Le filet de sécurité, et la preuve que la base est bien une projection de la chaîne.

## `scripts/reconcile.ts`

Exécutable en ligne de commande via `npm run reconcile`.

1. Récupérer le `slot` le plus élevé présent en base, ou zéro si la table est vide.
2. `getSignaturesForAddress(TREASURY_ADDRESS)` en paginant jusqu'à atteindre ce slot.
3. Pour chaque signature absente de la base, exécuter `verifyPurchase`, puis **appliquer les mêmes règles que la route d'achat** — `isAmountValid`, et `isSaleOpen` évalué à l'horodatage du bloc et non à l'instant présent — avant `insertPurchase`. Sans ces deux filtres, un virement hors bornes ou postérieur à la clôture serait crédité ici alors que l'API l'aurait refusé, et l'affirmation « `--from-scratch` reproduit la base » deviendrait fausse. Compter ces cas séparément dans le résumé : rien ne doit être écarté en silence.
4. Afficher un résumé : nombre de signatures examinées, insérées, ignorées, en erreur.

Le script doit être **idempotent** : deux exécutions consécutives ne produisent aucun doublon, la contrainte d'unicité s'en chargeant.

`tsx` charge les `.ts` en CommonJS, qui refuse l'`await` de premier niveau, et `config/env.ts` valide ses variables dès son import. Il faut donc charger `.env` **avant tout autre import** : un module `scripts/load-env.ts` de trois lignes, placé en premier import de `reconcile.ts`. Les imports étant hissés, l'ordre du fichier est le seul garant de l'ordre d'évaluation.

Il doit aussi accepter un mode `--from-scratch` reconstruisant toute la table depuis le premier bloc. C'est le test de l'affirmation « la chaîne est la source de vérité ». Si ce mode ne reproduit pas exactement la base existante, quelque chose est mal conçu.

Attention : ce script ne peut pas restaurer les codes d'affiliation, qui n'existent pas sur la chaîne. Les achats reconstruits sont insérés sans parrain. C'est acceptable et doit être documenté dans le README.

## Critère de validation

Supprimer manuellement une ligne d'achat, exécuter le script, la ligne est restaurée à l'identique hors code d'affiliation — le `id` mis à part, clé de substitution absente de la chaîne et donc irrécupérable par nature.

Supprimer une ligne **ancienne**, pas la dernière : le mode incrémental repart du slot le plus élevé présent en base, et un trou antérieur à ce slot lui est structurellement invisible. C'est `--from-scratch` qui le retrouve. Cette limite doit figurer dans le README, à côté de celle sur les codes d'affiliation.

---

# Étape 12 — Exploitation et déploiement

## Objectif

Mettre en ligne sur un serveur géré par **Coolify**, avec de quoi diagnostiquer un incident.

## Actions

1. **Journalisation** : chaque appel aux **deux** routes d'écriture produit une ligne JSON structurée — horodatage, portée, IP, signature, portefeuille, montant, résultat. C'est la trace exploitable en cas de litige. Coolify l'expose dans *Runtime Logs*.

2. **Alertes** : un webhook Discord ou Telegram déclenché sur chaque échec de vérification et chaque erreur `500`. Appel en « lance et oublie » : un service d'alerte injoignable ne doit pas transformer un incident en panne. À ne pas confondre avec les *Webhooks* de Coolify, qui signalent les échecs de **déploiement** — deux pannes différentes, deux canaux.

3. **Interrupteur de pause** : `SALE_PAUSED=true` désactive les achats et affiche une bannière. Un **Restart** suffit — la variable n'est pas préfixée `NEXT_PUBLIC_`, donc lue au démarrage et non compilée dans le bundle. Permet d'arrêter l'hémorragie à 23 h un samedi.

   Un achat payé pendant la pause n'est pas perdu : la transaction existe sur la chaîne, et la réconciliation l'enregistrera — elle ne tient délibérément pas compte de l'interrupteur. L'argent est arrivé, il doit être crédité.

4. **Déploiement Coolify**, dans cet ordre impératif :

   - déployer d'abord le **service PostgreSQL**, récupérer sa chaîne de connexion interne ; l'inverse échoue, l'application ne trouverait pas sa base ;
   - vérifier que le mot de passe généré ne contient aucun caractère réservé d'URL — `@` devient `%40`. Le symptôme est trompeur : `P1000: Authentication failed` fait chercher du côté des identifiants alors que c'est l'URL qui est mal découpée ;
   - *Build pack* : **Railpack**, le défaut de Coolify et son successeur maintenu de Nixpacks — images plus petites, cache de couches plus fin. Le choix importe peu dès lors que la version de Node est épinglée par `engines` et `.node-version`, que Railpack lit tous deux ; avec Nixpacks il faudrait la variable `NIXPACKS_NODE_VERSION` ;
   - *Build command* : `npx prisma generate && npx prisma migrate deploy && next build`. Les migrations tournent pendant le build, la base étant déjà déployée et joignable sur le réseau du projet. `migrate deploy` étant idempotent, relancer un déploiement échoué est sans risque ;
   - cocher **Buildtime** sur `NEXT_PUBLIC_DYNAMIC_ENV_ID` et `NEXT_PUBLIC_TREASURY_ADDRESS`. Sans cela le build échoue en les nommant — bruyant, mais bloquant. Corollaire durable : ces deux valeurs sont gravées dans le bundle, en changer une impose un *Redeploy* et non un simple *Restart* ;
   - Traefik et le certificat TLS sont gérés par Coolify, aucune configuration de proxy à écrire. Mais **Traefik *ajoute* l'IP réelle à `X-Forwarded-For` sans effacer ce que le client a envoyé** : lire le premier segment revient à lire ce que l'attaquant a bien voulu écrire. D'où `TRUSTED_PROXY_HOPS=1`, qui fait lire en partant de la fin. Sans cela, la limitation de débit se contourne en une ligne de `curl`.

5. **Sauvegarde** : *Backups* sur le service PostgreSQL — quotidien, rétention d'au moins trente jours, et une **destination distante** ; une sauvegarde stockée sur la machine sauvegardée n'en est pas une. Même si la base est reconstructible depuis la chaîne, une restauration prend deux minutes contre dix pour une réconciliation complète — et elle restitue les codes de parrainage, que la réconciliation ne peut pas retrouver.

6. **RPC dédié** : Helius, QuickNode ou Chainstack. L'endpoint public de Solana limite `getParsedTransaction` et fera échouer des vérifications légitimes en période de charge.

7. **Réconciliation planifiée** : *Scheduled Tasks* → commande `npm run reconcile`, fréquence `0 3 * * *`. Le nom d'hôte de la base fourni par Coolify n'étant résoluble que depuis le réseau Docker de l'application, le script ne peut pas être lancé depuis l'extérieur : il doit tourner *dans* le conteneur. Pour le ponctuel, le **Terminal** de Coolify.

8. **README** : installation, variables d'environnement, procédure de réconciliation, procédure de pause, et procédure de changement de thème pour le projet suivant.

## Critère de validation

`SALE_PAUSED=true` suivi d'un *Restart* désactive effectivement les achats et affiche la bannière. Une erreur volontaire déclenche bien l'alerte. **Une IP falsifiée dans `X-Forwarded-For` ne contourne pas la limitation de débit** — c'est le seul des trois qui échoue en silence, donc le seul qu'il faut éprouver avec un `curl` forgé plutôt que constater.

---

# Vérification finale

À passer en revue avant de considérer le projet terminé.

## Sécurité

1. `POST /api/purchases` n'accepte aucun montant ni adresse dans son corps
2. Le montant et l'expéditeur sont extraits de la chaîne, jamais de la requête
3. `txHash` est unique en base, et le code applicatif traduit l'erreur `P2002` proprement
4. Aucune clé privée nulle part
5. Une limitation de débit est active sur les routes d'écriture

## Intégrité des données

6. Aucun `update` ni `delete` sur `Purchase` dans tout le code
7. Aucun `parseFloat`, `Number()` ou `Math.pow` appliqué à un montant
8. Tous les montants sont des `BigInt` en unités de base
9. Les totaux sont calculés par agrégation SQL
10. Le script de réconciliation en mode `--from-scratch` reproduit la base

## Structure

11. `core/` n'importe ni React, ni Next, ni Prisma, ni Solana
12. `prisma.` n'apparaît que dans `lib/db/` et `prisma.ts`
13. Aucun composant ne calcule un montant
14. Aucune valeur métier hors de `config/project.ts`
15. Aucune couleur en dur dans le JSX
16. Chaque image n'est référencée qu'en un seul endroit : le logo du projet dans `brand-logo.tsx`, celui de Solana dans `solana-mark.tsx`

## Interface

17. Chaque état asynchrone a un rendu visuel dédié
18. Le compte à rebours gère l'état terminé
19. Un timeout de confirmation produit un message distinct d'un échec
20. La page fonctionne sans wallet connecté, sans zone vide inexpliquée
21. Le rendu est correct sur un écran de 360 px de large

## Qualité

22. `npm run typecheck` ne renvoie aucune erreur
23. `npm run lint` passe (ESLint CLI, pas `next lint`)
24. `npm run test` passe
25. Toute dépendance importée est déclarée dans `package.json`
26. Aucun bloc `catch` vide
27. `.env.example` est complet et le README à jour

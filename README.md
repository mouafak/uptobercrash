# Uptober Crash — Private Sale

Vente privée de token sur Solana. Le client envoie une signature de transaction,
le serveur la relit sur la chaîne et en extrait lui-même le montant et
l'expéditeur. La base de données n'est qu'un **index** de ce qui existe sur la
chaîne : elle se reconstruit intégralement à partir de la seule adresse de
trésorerie.

## Installation

Node.js 20.9 minimum, PostgreSQL, et un endpoint RPC Solana dédié.

```bash
npm install
cp .env.example .env      # puis renseigner les variables ci-dessous
npx prisma migrate deploy
npm run build
npm run start
```

En développement : `npm run dev`.

> npm 11.19 bloque les scripts d'installation par défaut. Les quatre scripts
> nécessaires — `@prisma/engines`, `prisma`, `esbuild`, `unrs-resolver` — sont
> déclarés dans le champ `allowScripts` de `package.json`, donc reproductibles
> en CI et en production sans intervention.

## Variables d'environnement

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | oui | Connexion PostgreSQL. Les caractères réservés du mot de passe doivent être encodés : `@` devient `%40`. |
| `SOLANA_RPC_URL` | oui | Endpoint RPC. **Prendre un fournisseur dédié** (Helius, QuickNode, Chainstack) : l'endpoint public limite `getParsedTransaction` et fera échouer des vérifications légitimes en charge. |
| `NEXT_PUBLIC_DYNAMIC_ENV_ID` | oui | Identifiant d'environnement Dynamic. |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | oui | Adresse de réception, en base58. |
| `SALE_PAUSED` | non | `true` coupe les achats. Défaut `false`. |
| `ALERT_WEBHOOK_URL` | non | Webhook Discord ou Telegram. Absent, les alertes sont muettes. |

Une variable manquante fait échouer le démarrage avec un message qui la nomme,
plutôt qu'un `undefined` découvert trois couches plus bas.

**Aucune variable ne contient de clé privée, et aucune ne doit en contenir.**
Cette application ne signe rien : la trésorerie est une simple adresse de
réception.

Les variables `NEXT_PUBLIC_*` sont **figées à la compilation**. Les changer
impose de reconstruire, pas seulement de redémarrer.

## Procédure de pause

Pour arrêter les achats sans redéployer :

```bash
sed -i 's/^SALE_PAUSED=.*/SALE_PAUSED=true/' .env
pm2 restart uptober-crash
```

Effet immédiat : la route `POST /api/purchases` répond `503 SALE_PAUSED`, et une
bannière s'affiche en tête de page. Revenir à `false` et redémarrer pour
reprendre.

Un achat payé pendant la pause n'est pas perdu : la transaction existe sur la
chaîne, et la réconciliation l'enregistrera — elle ne tient pas compte de
l'interrupteur, à dessein. L'argent est arrivé, il doit être crédité.

## Procédure de réconciliation

```bash
npm run reconcile                    # incrémental
npm run reconcile -- --from-scratch  # reconstruction totale
```

Le script lit la chaîne, repère les signatures absentes de la base et les
insère. Il ne supprime jamais rien, et la contrainte d'unicité sur `txHash` le
rend idempotent : deux exécutions consécutives ne produisent aucun doublon.

**Deux limites à connaître.**

Le mode incrémental repart du **slot le plus élevé présent en base**. Un trou
antérieur à ce slot lui est donc structurellement invisible. Pour réparer un
manque ancien, il faut `--from-scratch`.

Le script **ne peut pas restaurer les codes de parrainage**. Ils n'existent pas
sur la chaîne — seul le transfert de lamports y figure. Les achats reconstruits
sont donc insérés **sans parrain**, et la commission correspondante n'est pas
due. C'est une perte acceptée : la seule alternative serait de stocker le
parrainage ailleurs que dans la projection de la chaîne, ce qui ouvrirait la
porte à une divergence.

Quand lancer `--from-scratch` : après un incident de base, après une
restauration de sauvegarde, ou en contrôle périodique. S'il insère quoi que ce
soit alors que rien n'a été perdu, c'est qu'un achat est passé à travers l'API —
regarder les journaux à cette date.

## Changement de thème pour le projet suivant

Toute l'identité visuelle tient dans trois endroits.

1. **`config/project.ts`** — nom, symbole, décimales, taux, seuils, commission,
   date de fin, URLs. C'est la seule source des valeurs métier ; aucune ne doit
   apparaître ailleurs, ni dans un composant, ni dans un texte d'interface.
2. **`app/globals.css`** — les quatre couleurs en tête du bloc `:root` :
   `--background`, `--accent`, `--card`, `--foreground`. Tout le reste en
   dérive, y compris les jetons attendus par shadcn (`--primary`, `--input`,
   `--ring`…), qui ne sont que des alias. Changer ces quatre lignes rethème
   l'application entière sans toucher à un seul composant.
3. **`components/shared/brand-logo.tsx`** — seul fichier référençant le logo.
   Remplacer `public/up-logo-full.svg` et `public/up-logo-mark.svg`, ajuster les
   deux imports. Le logo Solana vit à part, dans
   `components/shared/solana-mark.tsx`.

Les polices sont dans `app/fonts.ts`, les fichiers `.woff2` dans `app/fonts/` —
volontairement pas dans `public/`, pour que `next/font/local` les hache et les
préchage.

## Exploitation

### Journalisation

Chaque appel aux routes d'écriture produit une ligne JSON sur la sortie
standard : horodatage, portée, IP, signature, portefeuille, montant, résultat.
C'est la trace exploitable en cas de litige.

```bash
pm2 logs uptober-crash --lines 200 | grep api/purchases
```

### Alertes

`ALERT_WEBHOOK_URL` reçoit une notification à chaque échec de vérification
on-chain et à chaque erreur 500. Le webhook est appelé sans attendre sa
réponse : un service d'alerte injoignable ne peut pas transformer un incident en
panne.

### Sauvegarde

Même si la base est reconstructible, une restauration prend deux minutes contre
dix pour une réconciliation complète.

```bash
# /etc/cron.daily/uptober-backup
#!/bin/sh
set -eu
STAMP=$(date -u +%Y%m%d)
pg_dump "$DATABASE_URL" | gzip > "/var/backups/uptober-$STAMP.sql.gz"
find /var/backups -name 'uptober-*.sql.gz' -mtime +30 -delete
```

Copier ensuite vers un stockage distant : une sauvegarde sur la machine
sauvegardée n'est pas une sauvegarde.

### Déploiement

```bash
npm run build:deploy   # prisma generate && prisma migrate deploy && next build
```

PM2 :

```bash
pm2 start npm --name uptober-crash -- run start
pm2 save && pm2 startup
```

Nginx en proxy inverse, avec certificat TLS via certbot :

```nginx
server {
  server_name privatesale.uotobercrash.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    # Réécrit, jamais concaténé : la limitation de débit s'appuie sur cet
    # en-tête, et celui du client ne doit pas pouvoir la contourner.
    proxy_set_header X-Forwarded-For   $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

> ⚠️ La ligne `X-Forwarded-For` est un point de sécurité, pas une formalité.
> Si le proxy laisse passer l'en-tête envoyé par le client, la limite de dix
> requêtes par minute se contourne en une ligne de `curl`.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | compilation de production |
| `npm run build:deploy` | migrations puis compilation |
| `npm run start` | serveur de production |
| `npm run lint` | ESLint (CLI ; `next lint` n'existe plus) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | tests du cœur métier |
| `npm run reconcile` | réconciliation avec la chaîne |

## Invariants du projet

À vérifier avant toute modification de fond.

- La table `Purchase` est **en écriture seule**. Aucun `update`, aucun `delete`,
  jamais. La clé étrangère vers `Affiliate` est en `RESTRICT` des deux côtés :
  la base elle-même refuse de réécrire un achat.
- Le serveur **ne fait jamais confiance** à un montant reçu du client. Il lit la
  transaction sur la chaîne.
- Les montants sont des `BigInt` en unités de base. Jamais de `parseFloat`, de
  `Number()` ni de `Math.pow` sur un montant.
- Le solde et la commission sont **calculés**, jamais stockés.
- `core/` n'importe ni React, ni Next, ni Prisma, ni Solana.
- `prisma.` n'apparaît que dans `lib/db/` et `prisma.ts`.

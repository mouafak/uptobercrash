# Uptober Crash — Private Sale

Vente privée de token sur Solana. Le client envoie une signature de transaction,
le serveur la relit sur la chaîne et en extrait lui-même le montant et
l'expéditeur. La base de données n'est qu'un **index** de ce qui existe sur la
chaîne : elle se reconstruit intégralement à partir de la seule adresse de
trésorerie.

## Installation locale

Pour la mise en production, voir [Déploiement](#déploiement) — l'application est
déployée par Coolify, cette section décrit une installation sur machine.

Node.js **20.12** minimum — `process.loadEnvFile()` l'exige —, PostgreSQL, et un endpoint RPC Solana dédié. La version de build est épinglée par `.node-version` et le champ `engines` de `package.json`.

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
| `TRUSTED_PROXY_HOPS` | non | Nombre de proxys de confiance en frontal. Défaut `1`. Voir ci-dessous. |

Une variable manquante fait échouer le démarrage avec un message qui la nomme,
plutôt qu'un `undefined` découvert trois couches plus bas.

### `TRUSTED_PROXY_HOPS` — à ne pas régler au hasard

`X-Forwarded-For` est une **liste**, et les proxys y *ajoutent* leur vision de
l'appelant sans effacer ce qui précède. Le début de la liste est donc écrit par
le client : le lire reviendrait à laisser n'importe qui se fabriquer une IP
différente à chaque requête et effacer toute limitation de débit.

On lit donc en partant de la fin. Compte le nombre de proxys que la requête
traverse avant d'atteindre l'application :

| Topologie | Valeur |
| --- | --- |
| Traefik (Coolify) ou Nginx en frontal | `1` |
| Cloudflare ou autre CDN devant le proxy | `2` |
| Aucun proxy, accès direct | sans objet, l'en-tête est absent |

Pour trancher : `dig +short <domaine>`. Si les IP retournées sont celles du
serveur, c'est `1`. Si ce sont celles d'un CDN, c'est `2`.

Une valeur trop grande n'ouvre aucune faille — la lecture retombe sur le dernier
segment, toujours écrit par le proxy le plus proche. Une valeur trop petite, en
revanche, fait partager un même compteur à tous les visiteurs.

**Aucune variable ne contient de clé privée, et aucune ne doit en contenir.**
Cette application ne signe rien : la trésorerie est une simple adresse de
réception.

Les variables `NEXT_PUBLIC_*` sont **figées à la compilation**. Les changer
impose de reconstruire, pas seulement de redémarrer.

## Procédure de pause

Pour arrêter les achats sans redéployer, depuis Coolify :

1. **Environment Variables** → passer `SALE_PAUSED` à `true`
2. **Restart** (pas *Redeploy* : inutile de reconstruire)

Compter une dizaine de secondes. `SALE_PAUSED` n'est pas préfixée
`NEXT_PUBLIC_`, elle est donc lue au démarrage du serveur et non gravée dans le
bundle — un redémarrage suffit.

Effet : la route `POST /api/purchases` répond `503 SALE_PAUSED`, et une
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

**Où le lancer.** Le nom d'hôte de la base fourni par Coolify n'est résoluble
que depuis le réseau Docker de l'application : le script doit donc tourner
*dans* le conteneur, pas depuis ta machine.

- ponctuellement : **Terminal** dans la barre latérale Coolify, puis
  `npm run reconcile`
- automatiquement : **Scheduled Tasks** → commande `npm run reconcile`,
  fréquence `0 3 * * *` (chaque nuit à 3 h)

Le script étant idempotent, une exécution quotidienne ne coûte rien et rattrape
tout achat qu'un incident réseau aurait fait manquer à l'API.

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

   Le **favicon** suit automatiquement : `app/layout.tsx` le prend de
   `brandMarkSrc`, exporté par ce même fichier. Il n'y a donc pas de copie de
   l'image à maintenir en parallèle, et l'URL servie est hachée par Next, donc
   invalidée à chaque changement de logo.

Les polices sont dans `app/fonts.ts`, les fichiers `.woff2` dans `app/fonts/` —
volontairement pas dans `public/`, pour que `next/font/local` les hache et les
préchage.

## Exploitation

### Journalisation

Chaque appel aux routes d'écriture produit une ligne JSON sur la sortie
standard : horodatage, portée, IP, signature, portefeuille, montant, résultat.
C'est la trace exploitable en cas de litige.

Coolify les expose dans **Runtime Logs**. Le champ `result` porte l'issue :
`RECORDED`, `ALREADY_RECORDED`, `TX_NOT_FOUND`, `SALE_PAUSED`, `RATE_LIMITED`…

```
{"ts":"2026-09-03T09:12:44.108Z","level":"info","scope":"api/purchases",
 "ip":"203.0.113.7","txHash":"3ksVhRw…","walletAddress":"3e8wH72F…",
 "lamports":"1000000000","result":"RECORDED"}
```

### Alertes

`ALERT_WEBHOOK_URL` reçoit une notification à chaque échec de vérification
on-chain et à chaque erreur 500. Le webhook est appelé sans attendre sa
réponse : un service d'alerte injoignable ne peut pas transformer un incident en
panne.

À ne pas confondre avec les **Webhooks** de Coolify, qui signalent les échecs de
*déploiement*. Les deux sont utiles et ne couvrent pas les mêmes pannes.

### Sauvegarde

Le service PostgreSQL de Coolify gère ses propres sauvegardes : **Backups** dans
la barre latérale du service base de données. Configurer une exécution
quotidienne, une rétention d'au moins trente jours, et surtout une **destination
distante** (S3) — une sauvegarde stockée sur la machine sauvegardée n'est pas
une sauvegarde.

Même si la base est reconstructible depuis la chaîne, une restauration prend
deux minutes contre dix pour une réconciliation complète. Et elle restitue les
codes de parrainage, que la réconciliation ne peut pas retrouver.

### Déploiement

Application Next.js déployée par Coolify, base PostgreSQL en service Coolify sur
le même projet.

**Ordre de mise en place.** Déployer d'abord le service PostgreSQL, récupérer sa
chaîne de connexion interne, puis créer l'application avec cette valeur en
`DATABASE_URL`. L'inverse échoue : l'application ne trouverait pas sa base.

> Vérifier que le mot de passe généré ne contient aucun caractère réservé
> d'URL — `@`, `#`, `/`, `?`. Le cas échéant, l'encoder : `@` devient `%40`.
> Le symptôme est trompeur, `P1000: Authentication failed`, qui fait chercher du
> côté des identifiants alors que c'est l'URL qui est mal découpée.

**Build pack :** Railpack, le défaut de Coolify.

La version de Node est épinglée par `engines` dans `package.json`, **borne haute
comprise** : chez Railpack `engines.node` prime sur `.node-version`, et une plage
ouverte (`>=20.12`) se résoudrait sur la version la plus récente existante,
quelle qu'elle soit. `.node-version` dit la même chose pour les outils locaux.

**Deployment lifecycle : laisser les deux champs vides.**

*Pre-deployment* s'exécute dans le conteneur **existant**, donc l'ancienne image :
son dossier `prisma/migrations` ne contient pas encore la migration que le
déploiement apporte. Y mettre `prisma migrate deploy` raterait précisément
celle-là — et au premier déploiement, il n'y a aucun conteneur existant.

*Post-deployment* s'exécute bien dans le nouveau conteneur, mais **après** la
bascule du trafic : le nouveau code servirait des requêtes contre une base non
migrée, et une migration ratée laisserait une application déjà en ligne.

Les migrations vivent donc dans le build, seul endroit qui réunit les trois
propriétés : les nouvelles migrations sont présentes, la CLI `prisma` l'est
aussi — c'est une dépendance de développement, absente de l'image d'exécution —,
et un échec interrompt le déploiement **avant** toute mise en ligne.

**Laisser les champs *Build command* et *Start command* vides.** Railpack
exécute les scripts `build` et `start` de `package.json` : la procédure de
déploiement vit ainsi dans le dépôt, pas dans une interface.

```json
"build": "prisma generate && next build",
"start": "prisma migrate deploy && next start"
```

**Les migrations ne peuvent pas tourner pendant le build.** Le conteneur de
build n'est pas attaché au réseau Docker du projet : le nom d'hôte interne de la
base n'y résout pas, et `prisma migrate deploy` échoue sur

```
P1001: Can't reach database server at `<hôte interne>:5432`
```

Le nom d'hôte est pourtant correct et la base en marche — c'est le demandeur qui
n'est pas sur le bon réseau. Aucun réglage ne rattache le conteneur de build ;
l'option *Connect To Predefined Network*, côté application, ne concerne que le
conteneur d'exécution, qui lui y est déjà.

Les migrations tournent donc **au démarrage du conteneur**, où la base est
joignable. C'est aussi le meilleur moment : si une migration échoue, le
conteneur s'arrête avant d'avoir servi la moindre requête et le déploiement est
marqué en échec. `migrate deploy` étant idempotent, chaque redémarrage la
revérifie sans risque.

> Ce montage suppose que la CLI `prisma`, déclarée en `devDependencies`, soit
> présente dans l'image d'exécution. C'est le cas avec Railpack, vérifié en
> production. Si un jour l'image élague les dépendances de développement — la
> variable `RAILPACK_NODE_PRUNE_CMD` existe — il faudra déplacer `prisma` en
> `dependencies`.

`build:deploy` reste utilisable pour un déploiement manuel hors Coolify, là où
la base est joignable depuis la machine qui construit.

**Variables de build.** Cocher **Buildtime** sur `NEXT_PUBLIC_DYNAMIC_ENV_ID` et
`NEXT_PUBLIC_TREASURY_ADDRESS`. Sans cela le build échoue en nommant les deux
variables — bruyant, mais bloquant.

Corollaire durable : ces deux valeurs sont **compilées dans le bundle**.
En changer une impose un *Redeploy*, pas un simple *Restart*. Les autres
variables — `DATABASE_URL`, `SOLANA_RPC_URL`, `SALE_PAUSED`,
`TRUSTED_PROXY_HOPS`, `ALERT_WEBHOOK_URL` — sont lues au démarrage : un
redémarrage suffit.

**Proxy.** Coolify place Traefik en frontal et gère le certificat TLS. Traefik
*ajoute* l'IP réelle à `X-Forwarded-For` sans effacer ce que le client a envoyé,
d'où `TRUSTED_PROXY_HOPS=1` : voir la section dédiée plus haut. Aucune
configuration de proxy à écrire à la main.

**Healthcheck.** Aucune route de santé dédiée n'est implémentée à ce jour :
Coolify se contente donc de vérifier que le port répond. Un conteneur dont la
base est injoignable passerait pour sain, et le trafic y serait basculé. Si
cette lacune devient gênante, ajouter un `GET /api/health` qui exécute une
requête triviale sur la base et rend `503` en cas d'échec, puis le déclarer dans
**Healthcheck**.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | compilation de production |
| `npm run build:deploy` | migrations puis compilation (équivalent local de la *Build command* Coolify) |
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

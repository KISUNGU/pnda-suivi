# PNDA — Suivi & Évaluation

Application web de suivi-évaluation du **Projet National de Développement Agricole**
(République Démocratique du Congo, Ministère de l'Agriculture, financement Banque mondiale).

Elle relie le cadre de résultats, le PTBA, la collecte de terrain et le RNA à une restitution
utilisable par la Coordination nationale (UNCP), les unités provinciales (UPEP), les opérateurs
techniques (OT) et le bailleur.

---

## Produit actif

Un seul produit est maintenu dans ce dépôt : **`backend/` + `frontend/`**.

| | |
|---|---|
| `backend/` | API Express en TypeScript, Postgres/Supabase |
| `frontend/` | React 19 + Vite + MUI, Redux Toolkit |
| `backend/supabase/migrations/` | Schéma et données de référence |
| `docs/sources/` | Documents faisant foi (voir plus bas) |

`_archive-refonte-se/` contient une implémentation antérieure (`server/` + `web/`), abandonnée.
Elle est conservée en local mais **exclue du dépôt** : ce n'est pas une référence, et le README
qu'elle décrivait a été remplacé par celui-ci.

---

## Sources de vérité

Les chiffres du système ne s'inventent pas dans le code. Trois documents font foi, réunis dans
`docs/sources/` :

| Document | Ce qu'il fixe |
|---|---|
| `cadre-resultats-v6.xlsx` | Les 32 indicateurs (7 IODP, 25 IR), leurs définitions, formules, cibles et désagrégations |
| `suivi-ptba-2026.xlsx` | Le PTBA 2026 et ses activités |
| `manuel-se-pnda-2024.pdf` | Le manuel S&E : responsabilités, fréquences, circuits de validation |

Une correction du cadre passe par une **nouvelle version de ces documents**, puis par une
migration — jamais par une retouche directe en base ou en dur dans le code.

Les données nominatives du RNA (`nom_complet`, téléphone, date de naissance) ne doivent jamais
entrer dans le dépôt. La CI refuse tout commit contenant `database/agriculteurs.sql` ou
`database/pnda_se.sql`.

---

## Démarrage

Node 22 recommandé (version utilisée en CI). npm.

```bash
# 1. Dépendances
npm install
npm --prefix backend install
npm --prefix frontend install

# 2. Configuration
cp backend/.env.example  backend/.env
cp frontend/.env.exemple frontend/.env

# 3. Renseigner backend/.env
#    DATABASE_URL : Supabase > Project Settings > Database > Connection string
#    JWT_SECRET   : 32 caractères minimum, sinon le serveur refuse de démarrer
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Appliquer les migrations de backend/supabase/migrations/ sur le projet Supabase

# 5. Lancer les deux services
npm run dev        # API sur :3001, front sur :5173
```

`backend/.env.local` surcharge `backend/.env` : pratique sur un poste de développement, mais
c'est la source d'écarts silencieux entre développeurs. En cas de comportement inattendu,
vérifier d'abord ce fichier.

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | API et front en parallèle |
| `npm --prefix backend run typecheck` | Vérification des types du backend |
| `npm --prefix backend run routes` | Liste les routes réellement montées |
| `npm --prefix backend run routes -- --check` | Échoue si l'inventaire des routes a changé |
| `npm --prefix frontend run typecheck` | Vérification des types du front |
| `npm --prefix frontend run lint:budget` | Vérifie que la dette de lint ne grossit pas |
| `npm run build` | Build de production des deux |

---

## Rôles et périmètre

Le rôle est porté par le jeton JWT et vérifié à chaque requête côté API.

| Rôle | Périmètre | Écran d'accueil |
|---|---|---|
| `super_admin` | National, + gestion des comptes | `/dashboard/national` |
| `admin` | National, + gestion des comptes | `/dashboard/national` |
| `uncp` | National — consolidation | `/dashboard/national` |
| `upep` | Sa province | `/dashboard/provincial` |
| `ot` | Sa province — collecte et validation terrain | `/dashboard/ot` |
| `partenaire` | Lecture selon convention | `/dashboard/partenaires` |
| `invite` | Aucun accès utile | — |

`invite` est le repli lorsque le profil en base n'est pas reconnu. Un compte qui s'y retrouve
verra la plupart des routes refusées : c'est le signe d'un `utilisateur.id_profil` mal renseigné,
et l'API le signale dans ses journaux à la connexion.

**Cloisonnement provincial** (`backend/src/middleware/scope.ts`) : pour un `upep` ou un `ot`, la
province portée par le jeton écrase le paramètre `?province=` de la requête, et toute écriture
visant une autre province est refusée. Les rôles nationaux (`super_admin`, `admin`, `uncp`) ne
sont pas restreints.

Le contrôle côté navigateur ne sert qu'à masquer des écrans. L'autorisation qui compte est celle
de l'API — et, à terme, les politiques RLS de Supabase.

---

## Architecture du backend

```
backend/src/
├── server.ts              Démarrage HTTP, arrêt propre (SIGINT/SIGTERM)
├── app.ts                 Assemblage : middlewares transverses + montage des routers
├── config/env.ts          Chargement de .env, JWT_SECRET, origines CORS
├── middleware/
│   ├── auth.ts            Vérification du jeton, requireRole
│   └── scope.ts           Cloisonnement provincial
├── routes/                Un router par domaine — 25 fichiers, 172 routes
│   ├── auth · dashboard · beneficiaires · indicateurs · cadre-resultats
│   ├── grm · risques · plans-attenuation · environnement
│   ├── ptba · activites · activites-database · ot · agent
│   ├── sig · cartes · fournisseurs · organisations · utilisateurs
│   └── notifications · calculateur · powerbi · database-views · aide · configuration
├── db.ts                  Couche d'accès aux données (en cours de découpage)
├── db/core.ts             Pool Postgres + couche de compatibilité mysql2 vers pg
├── db/types.ts            Types de la couche données
├── utils/mappers.ts       Base de données vers objets d'API
└── types/app.types.ts
```

Chaque router déclare des chemins absolus (`/api/...`) et est monté à la racine : les chemins
exposés sont exactement ceux d'avant le découpage, et l'ordre de montage reproduit l'ordre de
déclaration d'origine.

**`db/core.ts` porte une dette assumée.** La base a migré de MySQL vers Postgres, mais les
milliers d'appels existants gardent la forme mysql2 : placeholders `?`, tuple `[rows]`,
`result.insertId`, `DESCRIBE`. `compatQuery` traduit tout cela vers `pg` en un point unique.
Sortir du shim consiste à réécrire les appelants en SQL Postgres natif, domaine par domaine,
puis à supprimer `compatQuery` — sans jamais toucher à `getPgPool()`.

### Inventaire des routes

`backend/scripts/routes.snapshot.txt` fige les 172 routes exposées.
`npm run routes -- --check` compare l'application réellement montée à cet instantané et échoue
au moindre écart. C'est ce qui permet de restructurer le backend sans changer l'API par accident.

Quand une route change **volontairement**, régénérer l'instantané et le committer :

```bash
npm --prefix backend run routes -- --write
```

---

## Intégration continue

`.github/workflows/ci.yml`, trois jobs :

- **backend** — types, puis inventaire des routes inchangé.
- **frontend** — types, budget de lint, build de production.
- **secrets** — échoue si un `.env` ou un dump `database/*.sql` entre dans le dépôt.

Le frontend porte 119 erreurs et 5 avertissements ESLint hérités. Les bloquer d'un coup
arrêterait le chantier, les ignorer les laisserait grossir : `frontend/.lint-budget.json` fige
ce compte, et la CI échoue dès qu'il augmente. Elle échoue aussi quand il baisse, en demandant
d'abaisser le budget — le cliquet ne tourne que dans un sens.

---

## Ce que le dépôt ne fait pas encore

À jour au 9 septembre 2026, pour éviter de chercher ce qui n'existe pas :

- Les valeurs d'indicateurs ne sont pas **calculées** depuis les collectes validées, le RNA et
  le PTBA. Le calculateur est un outil à part.
- Il n'y a pas de cycle complet brouillon → soumis → contrôlé OT → validé UPEP → consolidé UNCP,
  avec motif de rejet, pièces jointes et horodatage.
- La désagrégation (sexe, jeunes, province, territoire) est incomplète au regard du cadre.
- Les formulaires de collecte sont statiques dans le front, non versionnés en base.
- Deux modules parallèles coexistent pour les mêmes objets — `/api/activites` et
  `/api/activites-database`, `/api/beneficiaires` et `/api/database/beneficiaires`. Tant que les
  deux vivent, le cadre peut être alimenté par deux chemins et donner deux chiffres.
- Le SIG n'exploite pas encore PostGIS pour le métier (sites, parcelles, zones d'intervention).

# PNDA — Plateforme Suivi & Évaluation

Application web de suivi-évaluation du **Projet National de Développement Agricole** (RDC,
financement Banque Mondiale) : cadre de résultats, saisie et validation des réalisations,
restitution cartographique (SIG).

L'authentification, les sessions et les droits sont gérés par l'API Node. Supabase est la base
de données (Postgres + PostGIS) ; il n'est plus le fournisseur d'identité.

> Ce dépôt ne concerne que le Suivi & Évaluation. Les dossiers `_archive-assurance`,
> `_sauvegarde-20260728-131313`, `supabase/migrations-assurancepay-archive` et `_to_delete` qui
> provenaient d'un autre produit (PndaPay / assurance agricole) ont été retirés du dépôt.

---

## Démarrage

Node 18 ou plus.

### Démonstration immédiate, sans base de données

```bash
npm install
cp server/.env.example server/.env     # AUTH_MODE=jwt,demo puis DEMO_DATA=1
npm run dev
```

L'écran de connexion propose cinq comptes cliquables, un par rôle (`admin@demo.pnda.cd` /
`demo-admin`, etc. — voir `server/src/lib/demoAuth.js`).

### Installation réelle

```bash
# 1. Appliquer les migrations supabase/migrations/0001 à 0007 sur le projet Supabase
#    dédié au S&E (extensions + PostGIS, identité JWT, audit, cadre de résultats,
#    seed du cadre, vues de synthèse, fonctions SIG).

# 2. Configurer
cp server/.env.example server/.env
#    AUTH_MODE=jwt
#    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")
#    SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Créer le premier administrateur
npm run creer-admin -- --email admin@pnda.cd --nom Mbuyi --prenom Jean

# 4. Lancer
npm run dev        # API sur :4000, front sur :5173
```

Le front n'a pas besoin de `.env` en mode JWT seul : il découvre les fournisseurs actifs via
`/api/auth/mode`. Un `web/.env` n'est nécessaire que si `AUTH_MODE` inclut `supabase`.

Ensuite, tous les comptes se créent depuis l'écran **Administration**.

**Production :** `AUTH_MODE=jwt` seul, `NODE_ENV=production`, `JWT_SECRET` fixe. Le serveur
refuse de démarrer sans secret et rejette les jetons de démonstration.

```bash
npm run build      # génère web/dist
npm start
```

---

## Authentification

L'API émet ses propres jetons. Trois fournisseurs peuvent coexister, activés par `AUTH_MODE` ;
le middleware reconnaît le type de jeton présenté et refuse ceux dont le fournisseur est
désactivé.

**Mots de passe** — hachés avec `scrypt` (paramètres N=16384, r=8, p=1) du module `crypto`
natif. Politique : 10 caractères minimum, trois familles de caractères sur quatre, refus des
mots de passe courants et de ceux contenant le nom ou l'adresse du titulaire.

**Jetons** — JWT HS256 signés directement avec `crypto`, algorithme figé et vérifié avant la
signature. Émetteur et audience contrôlés, expiration obligatoire. Le jeton d'accès vit 15
minutes ; le front le renouvelle silencieusement avant expiration.

**Rafraîchissement** — jetons opaques de 48 octets, dont seule l'empreinte SHA-256 est stockée.
Chaque usage consomme le jeton et en émet un nouveau (rotation). Si un jeton déjà consommé est
rejoué, toutes les sessions du compte sont révoquées — signature d'un vol de jeton.

**Verrouillage** — cinq échecs consécutifs verrouillent le compte quinze minutes, message
d'erreur identique que le compte existe ou non.

**Révocation** — un changement de mot de passe, de rôle, de province, ou une désactivation
ferment immédiatement toutes les sessions du compte.

---

## Rôles et périmètre

Cinq rôles, alignés sur la contrainte `CHECK` de `app_users`. Les permissions portent sur le
cadre de résultats (consultation, saisie des réalisations, validation) et le SIG.

| Rôle | Périmètre | Droits |
|---|---|---|
| `admin` | National | Tout, + gestion des comptes |
| `national` | National | Cadre, saisie, validation, SIG (lecture/écriture), audit |
| `se_provincial` | Sa province | Cadre, saisie, validation (dans sa province), SIG (lecture), audit |
| `ot` | Sa province | Cadre (lecture), saisie des réalisations, SIG (lecture) |
| `ac` | Sa province | Cadre (lecture), réalisations (lecture), SIG (lecture) |

La ligne nationale d'un indicateur (`province_id` = null) n'est saisissable que par les rôles à
périmètre national : les valeurs provinciales remontent du terrain, la consolidation nationale
reste un acte de la Coordination.

---

## Pages

| Page | Route | Contenu | Permission |
|---|---|---|---|
| Cadre de résultats | `/` | Composantes, résultats, indicateurs IODP/IR, séries annuelles, taux d'atteinte | `cadre:read` |
| Saisie des réalisations | `/saisie` | Cycle brouillon → soumis → validé (ou rejet), par indicateur/année/province/sexe | `realisations:read` |
| Carte & SIG | `/carte` | Provinces géoréférencées (PostGIS), sites projet, import de contours GeoJSON | `sig:read` |
| Administration | `/administration` | Comptes, rôles, réinitialisation/activation | `admin:read` |
| Journal d'audit | `/audit` | Actions plateforme, filtrées par périmètre | `audit:read` |

**Administration des comptes.** Création avec mot de passe provisoire affiché une seule fois,
réinitialisation, activation et désactivation. Rien n'est jamais supprimé. Un administrateur ne
peut ni retirer son propre rôle admin, ni désactiver son propre compte.

---

## Architecture

```
pnda-se/
├── server/                 API Express (Node 18+)
│   ├── scripts/
│   │   └── creer-admin.js  Amorçage du premier compte
│   └── src/
│       ├── config.js       Fournisseurs d'authentification, secrets, durées
│       ├── lib/
│       │   ├── passwords.js scrypt, politique, mots de passe provisoires
│       │   ├── users.js     app_users, sessions, rotation, verrouillage
│       │   ├── supabase.js  Client service_role
│       │   ├── demoAuth.js  Comptes locaux de démonstration
│       │   ├── provinces.js Normalisation des libellés divergents
│       │   └── audit.js     Journalisation applicative
│       ├── middleware/
│       │   ├── auth.js     Reconnaît le type de jeton, charge le profil
│       │   ├── rbac.js     Matrice de droits — FAIT AUTORITÉ
│       │   └── error.js
│       └── routes/         auth, me, cadre, realisations, sig, admin, audit
├── web/                    React 18 + Vite 5 + Tailwind
│   └── src/
│       ├── auth/           Contexte de session, copie indicative des droits
│       ├── components/     Layout, Sidebar, Header, primitives, graphiques
│       ├── pages/          CadreResultats, Saisie, CarteSig, Administration,
│       │                   Audit, Profil, Connexion, ChangementMotDePasse
│       └── lib/            Client API avec rotation, formatage
└── supabase/migrations/    0001 extensions+PostGIS, 0002 identité, 0003 audit,
                            0004 cadre de résultats + référentiel géo, 0005 seed,
                            0006 vues de synthèse, 0007 fonctions SIG
```

Le front ne parle jamais directement aux tables métier. Les permissions renvoyées au navigateur
servent uniquement à masquer des écrans — l'API revalide chaque requête.

---

## Legacy

`backend/` et `frontend/` (TypeScript) sont une ancienne tentative de ce même produit S&E,
initialement sur MySQL, dont la migration vers Supabase n'a pas été terminée. Le produit actif
est `server/` + `web/` (workspaces npm racine). Ne pas les confondre.


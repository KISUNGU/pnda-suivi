# PNDA Suivi-Evaluation

Application de suivi-evaluation du Programme National de Developpement Agricole, structuree en monorepo avec un backend Express/TypeScript et un frontend React/Vite.

## Structure du projet

- `backend/` : API Express, authentification, acces MySQL et routes metier
- `frontend/` : interface React, tableaux de bord, formulaires et pages fonctionnelles
- `scripts/` : scripts de demarrage du projet

## Prerequis

- Node.js 20 ou plus recent
- npm 10 ou plus recent
- MySQL accessible localement ou a distance

## Installation

Depuis la racine du projet :

```bash
npm run install:all
```

Cette commande installe les dependances de la racine, du backend et du frontend.

## Configuration backend

Creer un fichier `backend/.env` avec au minimum :

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pnda_se
JWT_SECRET=pnda_secret_key_2026
```

Notes :

- Le frontend cible par defaut `http://localhost:3000/api`.
- Si MySQL tourne en local sur Windows, `127.0.0.1` est plus fiable que `localhost` en cas de resolution IPv6.
- Sur cette machine de travail, la base validee pour le backend est `pnda_se`.
- Le backend renvoie `GET /api/health` pour verifier rapidement que l'API repond.
- La table `cadre_resultats` est creee et initialisee automatiquement au premier appel des endpoints `/api/cadre-resultats` et `/api/cadre-resultats/stats`.

## Demarrage en developpement

Lancer les deux applications en parallele :

```bash
npm run dev:both
```

Ou separer les processus :

```bash
npm run dev:backend
npm run dev:frontend
```

Applications disponibles :

- Frontend : `http://localhost:5173`
- Backend : `http://localhost:3000`
- Health check API : `http://localhost:3000/api/health`

## Build

Backend :

```bash
cd backend
npm run build
```

Frontend :

```bash
cd frontend
npm run build
```

## Comptes de demonstration

L'authentification backend s'appuie maintenant sur la table MySQL `utilisateur`.

- Utiliser un email existant dans `utilisateur`.
- Plusieurs lignes fournies utilisent `password123` comme mot de passe initial.
- Lors d'une connexion reussie avec un mot de passe en clair, le backend le re-hache automatiquement avec `bcrypt`.

## Stack technique

- Backend : Express, TypeScript, mysql2, JWT, bcryptjs
- Frontend : React 19, TypeScript, Vite, Material UI, Redux Toolkit, React Router

## Depannage rapide

- Si le backend ne demarre pas et signale une configuration manquante, verifier `DB_USER` et `DB_NAME`.
- Si l'authentification frontend echoue, verifier que `VITE_API_URL` pointe vers l'API backend attendue.
- Si le port 3000 est deja occupe, modifier `PORT` dans `backend/.env` et ajuster `VITE_API_URL` cote frontend.

## Licence

Le projet contient une licence MIT dans `LICENSE`.
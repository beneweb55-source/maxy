# Gestion Maxy — Plateforme de gestion de Stock / Revente Solution Maxy

Application web interne pour 4 associés : achat, test, réparation et revente de matériel informatique d'occasion. Cycle complet : **Arrivage → Test → Rapport → Validation → Prix → Vente → Caisse**.

Interface conforme à la charte graphique SolutionMaxi v3.0 (palette 10 teintes, typographie Inter) — icônes SVG uniquement, aucun emoji.

## Stack

- Next.js (App Router) + TypeScript strict — frontend et backend (`/app/api`)
- PostgreSQL + Prisma (Neon en production, PostgreSQL embarqué en local)
- Tailwind CSS v4 (tokens de la charte dans `app/globals.css`)
- Auth maison : cookie httpOnly signé (7 jours), hash `crypto.scryptSync` — aucune lib d'auth externe

## Installation

```bash
npm install
```

### Variables d'environnement

Copier `.env.example` vers `.env` et renseigner :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL PostgreSQL **pooler** (utilisée par l'application) |
| `DIRECT_URL` | URL PostgreSQL **directe** sans pooler (utilisée par `prisma migrate`) |
| `SESSION_SECRET` | 64 caractères hex aléatoires — signature des cookies de session |

En développement local, la base embarquée utilise :
`postgresql://maxy:maxy@localhost:5433/gestion_maxy` (pour les deux URLs).

### Base de données

```bash
npm run db:start         # démarre le PostgreSQL local embarqué (terminal dédié)
npx prisma migrate dev   # applique les migrations
npx prisma db seed       # initialise la base
```

Le seed remet la base à zéro puis crée **uniquement** les 4 comptes et les paramètres
(marge 20 %, objectif réserve 50 000 DA). **Aucune donnée factice** : lots, produits,
ventes et mouvements de caisse se créent exclusivement via l'interface.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` | Build de production |
| `npm test` | Tests unitaires (logique de caisse) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:start` | PostgreSQL local embarqué (port 5433, données dans `.pgdata/`) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | `prisma db seed` |

## Comptes

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `imed` | `imed2026` | gérant |
| `raouf` | `raouf2026` | technicien |
| `samy` | `samy2026` | dev |
| `louay` | `louay2026` | dev |

## Administration

Le panel `/administration` (gérant seul) permet de piloter l'application :

- **Caisse** : consultation des 3 soldes et ajustement du solde total (mouvement
  compensatoire tracé, jamais de réécriture de l'historique) ;
- **Paramètres métier** : marge minimum, objectif de réserve — appliqués immédiatement ;
- **Données** : compteurs par table, dernier mouvement de caisse ;
- **Comptes** : état des verrouillages de connexion, déverrouillage en un clic ;
- **Zone dangereuse** : réinitialisation complète des données métier (confirmation
  textuelle obligatoire), comptes et paramètres conservés.

## Structure

```
/app              → pages
/app/api          → endpoints API (Route Handlers)
/components       → composants UI (icons.tsx : librairie d'icônes SVG)
/lib              → logique métier, DB, calculs (dont caisse.ts, source unique du sens des mouvements)
/prisma           → schéma (GELÉ) + seed
/scripts          → dev-db.mjs (PostgreSQL local embarqué)
API.md            → contrat des endpoints
```

Le contrat complet des endpoints est dans [API.md](API.md). Le cahier des charges fait foi pour les règles métier et la matrice des droits.

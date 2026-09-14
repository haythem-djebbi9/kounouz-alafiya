# Kounouz Alafiya (كنوز العافية)

Plateforme de confiance et de traçabilité du miel — du producteur au consommateur final.
Chaque pot vendu peut être vérifié scientifiquement (analyse de laboratoire) et tracé via un
QR code unique : un scan = une histoire complète et vérifiée.

## Stack technique

- **Backend** : NestJS (TypeScript, ESM), PostgreSQL + Prisma ORM, JWT (RBAC à 5 rôles), Swagger.
- **Frontend** : React + TypeScript, Vite, Tailwind CSS.
- **Infra locale** : Docker Compose (PostgreSQL + backend + frontend).

## Démarrage rapide (tout via Docker)

```bash
docker compose up --build
```

- Frontend : http://localhost:5173
- API : http://localhost:3000/api
- Documentation Swagger : http://localhost:3000/api/docs

## Démarrage en développement (sans Docker pour le code, avec Docker pour Postgres)

1. Démarrer uniquement la base de données :

   ```bash
   docker compose up -d postgres
   ```

   > Le port hôte est `5433` (pas `5432`) pour éviter tout conflit avec un service
   > PostgreSQL déjà installé localement. Voir `backend/.env.example`.

2. Backend :

   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run prisma:migrate      # applique le schéma
   npm run prisma:seed         # charge les données de démonstration
   npm run start:dev
   ```

3. Frontend (autre terminal) :

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Comptes de démonstration (créés par le seed)

| Rôle                  | Email                              | Mot de passe |
| --------------------- | ----------------------------------- | ------------ |
| Admin                 | admin@kounouzalafiya.com           | Admin123!    |
| Équipe de vérification| verification@kounouzalafiya.com    | Verif123!    |
| Agent terrain         | agent@kounouzalafiya.com           | Agent123!    |
| Producteur            | producteur@kounouzalafiya.com      | Prod123!     |
| Producteur (2)        | fatma.trabelsi@kounouzalafiya.com  | Prod123!     |
| Consommateur          | client@kounouzalafiya.com          | Client123!   |

Deux chaînes de traçabilité complètes sont préchargées :

- `KZ-QR-2026-000001` — Miel de Sedra Premium 500g → **Vérifié** ✅
- `KZ-QR-2026-000002` — Miel de Fleurs Sauvages 250g → **Suspendu** ⏸️ (scans anti-fraude suspects)

## Authentification

JWT (access token courte durée + refresh token, avec rotation et invalidation en base) et RBAC
à 5 rôles (`ADMIN`, `VERIFICATION_TEAM`, `FIELD_AGENT`, `PRODUCER`, `CONSUMER`).

- `POST /api/auth/register` — auto-inscription publique, réservée aux rôles `PRODUCER` et `CONSUMER`.
- `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `POST /api/auth/register-staff` — création de comptes internes (Admin, Équipe de vérification,
  Agent terrain), réservée aux administrateurs.

Toutes les routes sont protégées par défaut (`JwtAuthGuard` + `RolesGuard` globaux) ; une route
publique doit être explicitement marquée avec le décorateur `@Public()`, et une route restreinte
à certains rôles avec `@Roles(Role.ADMIN, ...)`.

## Catalogue & QR Code

- `GET /api/categories` (public) — catalogue actif ; `GET /api/categories/admin` — toutes les
  catégories (Admin/Équipe). Suppression bloquée si des produits sont rattachés.
- `GET /api/products/catalog` (public) — produits `PUBLIE` uniquement ; le reste des routes
  `/api/products` est réservé à Admin/Équipe de vérification.
- Un produit ne peut passer en `PUBLIE` que si son lot est rattaché et au statut `READY`
  (emballage finalisé) ; le QR code est généré automatiquement à la première publication et
  ne change plus jamais.
- `GET /api/verify/:qrId` (public, sans connexion) — page de vérification : renvoie le statut
  affiché (`VERIFIED`/`SUSPENDED`), le produit, le producteur, le lot et l'analyse de
  laboratoire complète ; chaque appel journalise un `QRScan`.
- `GET /api/verify/:qrId/image` (public) — image PNG du QR code.

## Anti-fraude & Rapports

- Chaque scan de la page de vérification publique est évalué automatiquement : trop de
  scans en peu de temps, plusieurs pays en peu de temps, ou volume anormal sur 24h →
  `QRScan.flagged = true`. Le consommateur n'est jamais bloqué, seule l'équipe interne
  voit l'alerte via `GET /api/anti-fraud/flagged-scans` et `GET /api/anti-fraud/stats`.
- `GET /api/reports/operations` — volumes par statut à chaque étape du flux, taux de
  vérification. `GET /api/reports/by-producer` — répartition par producteur.
  `GET /api/reports/anti-fraud` — statistiques anti-fraude.
- Export : `GET /api/reports/operations/export?format=csv|pdf` et
  `GET /api/reports/by-producer/export` (CSV).

## Structure du dépôt

```
kounouz affia/
├── backend/            NestJS + Prisma (API REST, /api/docs pour Swagger)
├── frontend/           React + Vite (marketplace + page de vérification publique)
└── docker-compose.yml  Orchestration locale complète
```

## Avancement

- [x] Étape 1 — Monorepo, Docker, PostgreSQL, schéma Prisma, seed de démonstration
- [x] Étape 2 — Auth + 5 rôles + guards
- [x] Étape 3 — Flux cœur métier (Demande → Échantillon → Scellé → Labo → Vérification)
- [x] Étape 4 — Batch → Packaging → Catégories → Produits → QR Code
- [x] Étape 5 — Anti-fraude + Rapports
- [ ] Étape 6 — Design System + Portail Producteur
- [ ] Étape 7 — Portail Agent Terrain (mobile-first)
- [ ] Étape 8 — Centre de Vérification + Gestion Produits/Catégories
- [ ] Étape 9 — Marketplace + Page de vérification publique
- [ ] Étape 10 — Responsive sur les 3 breakpoints
- [ ] Étape 11 — Tests, documentation, finalisation

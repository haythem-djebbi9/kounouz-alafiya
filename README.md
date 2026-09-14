# Kounouz Alafiya (كنوز العافية)

Plateforme de confiance et de traçabilité du miel — du producteur au consommateur final.
Chaque pot vendu peut être vérifié scientifiquement (analyse de laboratoire) et tracé via un
QR code unique : un scan = une histoire complète et vérifiée.

## Stack technique

- **Backend** : NestJS (TypeScript, ESM), PostgreSQL + Prisma ORM, JWT (RBAC à 5 rôles), Swagger.
- **Frontend** : React + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query.
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

## Frontend — Design System & Portail Producteur

- `frontend/src/design-system/` : composants réutilisables (`Button`, `Card`, `Badge`,
  `StatusBadge`, `Timeline`, `QRCodeDisplay`, `Input`/`Textarea`/`Select`, `EmptyState`, `Alert`)
  construits sur l'identité visuelle existante (vert `#0C261B`, or `#D49B37`, crème `#FAF6EE`).
- `frontend/src/lib/` : client API (`api.ts`, rafraîchissement automatique du jeton sur 401),
  contexte d'authentification (`auth-context.tsx`), client TanStack Query.
- `frontend/src/portals/producer/` : espace producteur complet — tableau de bord, demande de
  vérification en 3 étapes avec barre de progression, suivi en timeline (langage simple, jamais
  de jargon), profil, produits publiés avec QR code. Connecté à l'API réelle (aucune donnée
  simulée), protégé par rôle (`PRODUCER`).
- La vitrine existante (`App.tsx` et ses composants) reste inchangée à ce stade — elle sera
  branchée sur l'API réelle à l'étape 9.

## Frontend — Portail Agent Terrain (mobile-first)

- `frontend/src/portals/agent/` : un seul écran principal (« مهامي ») listant les demandes
  acceptées en attente de collecte (pool partagé — voir note ci-dessous) et les échantillons
  en cours, puis des sous-écrans de collecte (formulaire en 3 étapes avec upload photo réel)
  et de détail d'échantillon (application du scellé, passage en transit).
- Layout volontairement minimal (pas de barre latérale) : l'agent travaille depuis son
  téléphone, une tâche à la fois.
- `POST /api/uploads/sample-photo` (nouveau, rôle `FIELD_AGENT`) : upload réel de photos de
  preuve (JPEG/PNG/WebP, 5 Mo max), stockage disque local servi via `/uploads`, structure
  prête pour un stockage cloud plus tard.
- `GET /api/verification-requests/pending-collection` (nouveau, rôle `FIELD_AGENT`) : demandes
  acceptées sans échantillon. Le cahier des charges parle de « collectes assignées », mais le
  schéma ne modélise pas d'affectation nominative à un agent précis — ce pool partagé est donc
  visible par tous les agents terrain, premier arrivé premier servi.

## Frontend — Centre de Vérification & Gestion Produits/Catégories

- `frontend/src/portals/admin/` : espace Admin + Équipe de vérification, 14 sections
  (tableau de bord avec KPIs, producteurs, demandes, échantillons, scellés, laboratoire,
  vérification, lots, emballage, produits, catégories, QR codes, rapports, équipe —
  cette dernière réservée à Admin). Chaque section est branchée sur l'API réelle.
- Décision de vérification : impossible de choisir "Vérifié" si l'analyse labo n'est pas
  conforme (le formulaire désactive l'option et l'explique).
- Fiche produit : aperçu avant publication (images, prix, description, QR code, lot associé),
  actions de statut contextuelles (publier / rupture / suspendre / republier).
- `GET /auth/users` et `PATCH /auth/users/:id/status` (nouveau, rôle `ADMIN`) : liste des
  comptes et activation/désactivation — complète la création de comptes internes déjà
  existante (étape 2).
- **Deux bugs réels trouvés et corrigés pendant les tests en conditions réelles** :
  1. Course dans `AuthProvider` — le chargement initial du profil (avec un jeton périmé
     d'une session précédente encore en `localStorage`) pouvait se terminer *après* une
     connexion fraîche et écraser le bon utilisateur avec l'ancien, provoquant une
     redirection vers la mauvaise page après connexion. Corrigé en vérifiant que le jeton
     n'a pas changé avant d'appliquer la réponse.
  2. `resolveFileUrl` réécrivait à tort les images statiques du frontend (`/images/...`)
     vers l'origine du backend. Corrigé pour ne réécrire que les fichiers réellement
     servis par le backend (`/uploads/...`).
- « Paramètres » (mentionné dans le cahier des charges) n'a volontairement pas été construit :
  aucun réglage système réel n'existe dans le schéma actuel, et une page sans effet aurait
  été trompeuse. À ajouter si un besoin concret émerge.

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
- [x] Étape 6 — Design System + Portail Producteur
- [x] Étape 7 — Portail Agent Terrain (mobile-first)
- [x] Étape 8 — Centre de Vérification + Gestion Produits/Catégories
- [ ] Étape 9 — Marketplace + Page de vérification publique
- [ ] Étape 10 — Responsive sur les 3 breakpoints
- [ ] Étape 11 — Tests, documentation, finalisation

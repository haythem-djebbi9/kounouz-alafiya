# --- Étape 1 : dépendances + build -----------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# npm ci : installation reproductible à partir du lockfile.
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# --- Étape 2 : dépendances de production uniquement -------------------------
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# --- Étape 3 : image d'exécution -------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# tini : PID 1 correct, pour que SIGTERM arrête proprement le process Node.
RUN apk add --no-cache tini wget

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY prisma ./prisma

# Fichiers téléversés (volumes montés) : publics/signés dans uploads,
# documents d'identité des producteurs dans private-uploads. Les dossiers
# doivent exister dans l'image pour que Docker initialise les volumes avec
# le bon propriétaire (node), sinon l'API ne pourrait pas y écrire.
RUN mkdir -p uploads private-uploads && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/health >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# Les migrations sont appliquées au démarrage (migrate deploy : jamais
# destructif, contrairement à migrate dev). Elles passent par le port 5432,
# que certains hébergeurs n'atteignent pas sur une base Neon : leur échec ne
# doit alors pas empêcher l'API de démarrer, puisque celle-ci sait se
# rabattre sur le WebSocket (KZ_DB_WEBSOCKET, voir prisma.service.ts). Dans
# ce cas, appliquez les migrations depuis votre poste avec
# `scripts/charger-donnees-neon.ps1`.
CMD ["sh", "-c", "npx prisma migrate deploy || echo '[demarrage] migrations non appliquees : port 5432 injoignable, poursuite du demarrage'; node dist/main.js"]

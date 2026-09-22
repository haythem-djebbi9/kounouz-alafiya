#!/bin/sh
# Démarrage de l'API dans le conteneur.
#
# 1. Les migrations sont appliquées si elles le peuvent. Leur échec n'empêche
#    pas l'API de démarrer : certains réseaux bloquent le port 5432 vers une
#    base Neon, et l'API sait alors se connecter par le WebSocket (443).
# 2. Les données de démonstration sont chargées uniquement si la base est vide
#    et si KZ_SEED_AU_DEMARRAGE=1. Le chargement dure plusieurs minutes : il
#    tourne en arrière-plan pour que le port s'ouvre tout de suite, faute de
#    quoi l'hébergeur considérerait le démarrage en échec.
set -u

npx prisma migrate deploy \
  || echo "[démarrage] migrations non appliquées : la base est injoignable en TCP, poursuite"

if [ "${KZ_SEED_AU_DEMARRAGE:-0}" = "1" ]; then
  npx tsx prisma/amorcer.ts &
fi

exec node dist/main.js

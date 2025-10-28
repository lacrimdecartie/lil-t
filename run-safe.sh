#!/bin/bash
set -Eeuo pipefail

APP="/mnt/user/appdata/lil-t"
LOG="${1:-$APP/build-latest.log}"

# Alles in Datei + Konsole spiegeln
exec > >(tee -a "$LOG") 2>&1

echo "=== $(date) | lil-T: Build/Start beginnt ==="
echo "Arbeitsverzeichnis: $APP"
cd "$APP"

# Fehler-Falle: Log zeigen und offen bleiben
trap 'code=$?; echo; echo "❌ FEHLER (Exit $code) in Zeile $LINENO: $BASH_COMMAND"; echo "Log: $LOG"; echo; echo "— Folge Log live — (Strg+C beendet)"; tail -n +1 -f "$LOG" || true' ERR

echo "[1/3] docker compose build --no-cache"
docker compose build --no-cache

echo "[2/3] docker compose up -d"
docker compose up -d

echo "[3/3] Container-Logs folgen (Strg+C zum Beenden) …"
docker logs -f lil-t

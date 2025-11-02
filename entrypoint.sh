#!/bin/sh
set -e

echo "[entrypoint] Starte Initialisierung..."
# --- Server Deps ---
if [ ! -f "/app/server/node_modules/express/package.json" ]; then
  echo "[entrypoint] Installiere Server-Dependencies..."
  npm --prefix /app/server install --no-audit --no-fund
fi

# --- Client Deps (inkl. dev) ---
if [ ! -d "/app/client/node_modules" ] || [ ! -x "/app/client/node_modules/.bin/vite" ]; then
  echo "[entrypoint] Installiere Client-Dependencies (inkl. dev)..."
  npm_config_production=false npm --prefix /app/client install --no-audit --no-fund
fi

# --- Client Build (aus /app/client heraus!) ---
if [ ! -f "/app/client/dist/index.html" ]; then
  echo "[entrypoint] Baue Client (vite build in /app/client)..."
  cd /app/client
  npm_config_production=false npx vite build
  cd /app
fi

# --- Server Start ---
echo "[entrypoint] Starte Server..."
exec node /app/server/server.js

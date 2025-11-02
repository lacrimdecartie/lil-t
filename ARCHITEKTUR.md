# lil-t Mindmap Webapp — Architektur & Plan

## Ziel
Ein Single-Container Mindmap-Tool mit React Flow UI und Node/Express Backend,
SQLite Persistenz und REST-API. Lauffähig auf Unraid unter Port 39093.

## Stack
- Frontend: React + React Flow + Zustand + Axios
- Backend: Node.js + Express + SQLite (better-sqlite3)
- Auth: JWT, bcrypt
- State-Persistenz: SQLite-DB unter /data/app.db
- Volume-Mount: ${APP_DIR}:/app, ${DATA_DIR}:/data
- Healthcheck: /healthz

## React Flow Features
- Doppelklick ins Leere → neuer Node
- Doppelklick auf Node → Name ändern
- Doppelklick auf Edge → Label setzen
- Drag-to-connect → neue Edge
- Edge-Richtung togglebar
- Rechtsklick-Menüs
- Light/Dark Theme
- CSV Import/Export
- Bilder im Node (Upload/Kamera)

## Datenmodell (geplant)
- users (id, username, password_hash)
- maps (id, name, description, owner_id)
- nodes (id, map_id, label, x, y, description, image_path)
- edges (id, map_id, source, target, label, directed)
- attachments (id, node_id, path)
- share_tokens (id, map_id, token, expires_at)

## Migrationsstrategie
1. Basis-Schema (users, maps)
2. Nodes & Edges
3. Attachments & Sharing
4. Seed-Daten (Beispiel-Map mit 3 Nodes + Relationen)

## Containerstruktur
/app  → Sourcecode (persistiert)
/data → SQLite & Uploads
Port  → 39093:39093

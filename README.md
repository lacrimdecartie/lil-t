# lil-T

Einfacher 1-Container Mindmap/Concept-Map Editor mit N:N-Relationen.
Stack: Next.js 14 + React Flow + Prisma/SQLite. PWA-ready.

## Start (Unraid)
1) Lege diesen Ordner auf deinem Server ab (z. B. `/mnt/user/appdata/lil-T/app`).
2) Starte Build & Run:
   ```bash
   docker compose up -d --build
   ```
3) Öffne: `http://10.0.1.15:39093`

## Persistenz
- SQLite-Datei liegt im Host-Volume: `/mnt/user/appdata/lil-T/data/app.db`

## Backup
- Sichere den Ordner `/mnt/user/appdata/lil-T/data`.

## Lokale Entwicklung (optional)
```bash
pnpm i
pnpm prisma migrate dev
pnpm dev
```

## Roadmap
- Farben/Labels/Styles für Edges erweitern
- Import/Export (JSON/CSV, PNG/SVG)
- Snapshots, Undo/Redo
- Realtime (Yjs) & Auth (Phase 2)

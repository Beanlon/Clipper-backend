# Clipper-backend

Express API + BullMQ job pipeline for [Clipper](https://github.com/Beanlon/Clipper-frontend).

- **Local disk** for media (`CLIPPER_DATA_DIR`) — no cloud media bucket
- **Supabase** for Auth + job/library metadata
- **BullMQ + Redis** for generate pipeline (FFmpeg / faster-whisper stubs)

## Quick start

```bash
cp .env.example .env
npm install
npm run typecheck

# Terminal 1 — API
npm run dev

# Terminal 2 — worker (needs Redis)
npm run dev:worker
```

Health: `GET http://localhost:4000/health`

Dev auth: `Authorization: Bearer stub:demo-user`

## Docs

- [API reference](./docs/api.md)
- Schema: [`supabase/migrations/001_clipper_schema.sql`](./supabase/migrations/001_clipper_schema.sql)

## Pipeline stages

`queued` → `fetching` → `cutting` → `transcribing` → `burning` → `packing` → `ready` | `failed`

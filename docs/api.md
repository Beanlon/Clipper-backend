# Clipper Backend API (v1 stubs)

Express + BullMQ pipeline. Media stays on **local disk** (`CLIPPER_DATA_DIR`); Supabase holds Auth + metadata only.

Base URL (dev): `http://localhost:4000`

Auth: `Authorization: Bearer <supabase-jwt>`  
Dev stub: `Authorization: Bearer stub:<userId>` when `AUTH_STUB=true`.

---

## Health

### `GET /health`

```json
{ "ok": true, "service": "clipper-backend" }
```

---

## Auth

### `POST /api/auth/session`

Validates JWT and returns the user.

**Response**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Name"
  }
}
```

---

## Library

### `GET /api/library`

Lists jobs + sources metadata for the signed-in user (Library screen).

**Response**

```json
{
  "jobs": [
    {
      "id": "uuid",
      "source_id": "uuid",
      "status": "ready",
      "framing": "9:16",
      "caption_style": "default",
      "language": "en",
      "progress_pct": 100,
      "error": null,
      "created_at": "...",
      "updated_at": "...",
      "scene_count": 2
    }
  ],
  "sources": [
    {
      "id": "uuid",
      "kind": "youtube",
      "title": "...",
      "duration_ms": 120000,
      "created_at": "..."
    }
  ]
}
```

---

## Sources

### `POST /api/sources`

Register a local upload path or YouTube URL (no cloud media upload).

**Body**

| Field | Type | Notes |
|---|---|---|
| `kind` | `"upload" \| "youtube"` | required |
| `title` | string | optional |
| `local_path` | string | required when `kind=upload` |
| `youtube_url` | string (url) | required when `kind=youtube` |
| `duration_ms` | number | optional |

**Response** `201` → `{ "source": { ... } }`

### `GET /api/sources/:id`

Source metadata + local path ref.

---

## Jobs

Job statuses (pipeline stages):

`queued` → `fetching` → `cutting` → `transcribing` → `burning` → `packing` → `ready` | `failed`

### `POST /api/jobs`

Create a generation job.

**Body**

```json
{
  "source_id": "uuid",
  "framing": "9:16",
  "caption_style": "default",
  "language": "en",
  "scenes": [{ "in_ms": 0, "out_ms": 15000 }]
}
```

- `framing`: `9:16` | `16:9` | `1:1` (default `9:16`)
- `language`: `en` | `fil` (default `en`)

**Response** `201` → `{ "job": { ..., "scenes": [...] } }`

### `GET /api/jobs/:id`

Job status + scenes + export records.

### `PATCH /api/jobs/:id/scenes`

Upsert filmstrip In/Out ranges.

**Body**

```json
{
  "scenes": [
    { "id": "optional-uuid", "in_ms": 1000, "out_ms": 12000 },
    { "in_ms": 20000, "out_ms": 35000 }
  ]
}
```

### `POST /api/jobs/:id/generate`

Enqueue BullMQ pipeline (`clipper-pipeline`). If Redis is unavailable, runs the stub pipeline **inline** and returns `mode: "inline"`.

**Response** `202`

```json
{
  "accepted": true,
  "mode": "queue",
  "queue_job_id": "...",
  "job": { ... }
}
```

### `GET /api/jobs/:id/export`

Returns export metadata (local paths).  
Query: `scene_id`, `download=1` to stream a file (or stub marker).

### `GET /api/jobs/:id/events`

SSE progress stream.

```
event: progress
data: {"jobId":"...","status":"cutting","progress_pct":25,"at":"..."}

event: done
data: {"jobId":"...","status":"ready","progress_pct":100,"at":"..."}
```

---

## Local media layout

```
$CLIPPER_DATA_DIR/
  users/{userId}/
    sources/{sourceId}/raw.{ext}
    jobs/{jobId}/
      scenes/{sceneId}.mp4
      captions/{sceneId}.srt|ass
      exports/{sceneId}.mp4
      progress.json
```

Default `CLIPPER_DATA_DIR`: `./.clipper-data`

---

## Worker process

```bash
npm run dev          # API
npm run dev:worker   # BullMQ worker (Redis required)
```

Pipeline stubs (replace with real binaries later):

| Stage | Module | Intended tool |
|---|---|---|
| fetch | `workers/fetchYoutube.ts` | yt-dlp |
| cut | `workers/cutScenes.ts` | FFmpeg |
| ASR | `workers/transcribe.ts` | faster-whisper |
| burn | `workers/burnIn.ts` | FFmpeg ass/srt |
| pack | `workers/packExport.ts` | finalize paths |

---

## Supabase

Schema: `supabase/migrations/001_clipper_schema.sql`

Tables: `profiles`, `sources`, `jobs`, `scenes`, `exports`  
RLS: row owner `user_id = auth.uid()` (scenes/exports via parent job).

API stubs currently keep metadata **in memory**; wire `src/lib/store.ts` to Supabase once project credentials are set.

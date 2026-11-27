import { Router } from "express";
import { store } from "../lib/store";
import type { AuthedRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

export const libraryRouter = Router();

/** List projects/jobs metadata for the signed-in user. */
libraryRouter.get("/", requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const jobs = store.listJobs(userId);
  const sources = store.listSources(userId);

  res.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      source_id: j.source_id,
      status: j.status,
      framing: j.framing,
      caption_style: j.caption_style,
      language: j.language,
      progress_pct: j.progress_pct,
      error: j.error,
      created_at: j.created_at,
      updated_at: j.updated_at,
      scene_count: j.scenes?.length ?? 0,
    })),
    sources: sources.map((s) => ({
      id: s.id,
      kind: s.kind,
      title: s.title,
      duration_ms: s.duration_ms,
      created_at: s.created_at,
    })),
  });
});

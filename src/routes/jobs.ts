import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ensureJobDirs } from "../lib/paths";
import { subscribeProgress } from "../lib/progress";
import { store } from "../lib/store";
import type { AuthedRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { enqueuePipeline } from "../queue/pipeline";
import { runPipeline } from "../workers/runPipeline";
import type { ProgressEvent } from "../types";

export const jobsRouter = Router();

const createJobSchema = z.object({
  source_id: z.string().uuid(),
  framing: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  caption_style: z.string().min(1).default("default"),
  language: z.enum(["en", "fil"]).default("en"),
  scenes: z
    .array(
      z.object({
        in_ms: z.number().int().nonnegative(),
        out_ms: z.number().int().positive(),
      }),
    )
    .optional(),
});

const scenesSchema = z.object({
  scenes: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        in_ms: z.number().int().nonnegative(),
        out_ms: z.number().int().positive(),
      }),
    )
    .min(1),
});

function ownedJob(userId: string, jobId: string) {
  const job = store.getJob(jobId);
  if (!job || job.user_id !== userId) return null;
  return job;
}

/** Create generation job (source + settings). */
jobsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId } = req as AuthedRequest;
  const source = store.getSource(parsed.data.source_id);
  if (!source || source.user_id !== userId) {
    res.status(404).json({ error: "Source not found" });
    return;
  }

  const scenes = (parsed.data.scenes ?? []).filter((s) => s.out_ms > s.in_ms);
  const job = store.createJob(
    userId,
    {
      source_id: source.id,
      status: "queued",
      framing: parsed.data.framing,
      caption_style: parsed.data.caption_style,
      language: parsed.data.language,
      progress_pct: 0,
      error: null,
    },
    scenes,
  );

  await ensureJobDirs(userId, job.id);
  res.status(201).json({ job });
});

jobsRouter.get("/:id", requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const job = ownedJob(userId, req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({ job, exports: store.listExports(job.id) });
});

/** Upsert scene In/Out ranges (filmstrip slider). */
jobsRouter.patch("/:id/scenes", requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const job = ownedJob(userId, req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const parsed = scenesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  for (const s of parsed.data.scenes) {
    if (s.out_ms <= s.in_ms) {
      res.status(400).json({ error: "Each scene requires out_ms > in_ms" });
      return;
    }
  }

  const rows = store.upsertScenes(job.id, parsed.data.scenes);
  res.json({ scenes: rows });
});

/**
 * Enqueue BullMQ pipeline. Falls back to in-process stub when Redis is down
 * (dev-friendly; production should keep Redis up).
 */
jobsRouter.post("/:id/generate", requireAuth, async (req, res) => {
  const { userId } = req as AuthedRequest;
  const job = ownedJob(userId, req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if ((job.scenes?.length ?? 0) === 0) {
    res.status(400).json({ error: "Add at least one scene before generate" });
    return;
  }

  store.setJobStatus(job.id, "queued", 0, null);

  const payload = { jobId: job.id, userId, sourceId: job.source_id };
  let mode: "queue" | "inline" = "queue";
  let queueJobId: string | null = null;

  try {
    queueJobId = await enqueuePipeline(payload);
  } catch (err) {
    console.warn("[jobs] Redis enqueue failed; running inline stub", err);
    mode = "inline";
    void runPipeline(payload).catch((e) => {
      console.error("[jobs] inline pipeline failed", e);
    });
  }

  res.status(202).json({
    accepted: true,
    mode,
    queue_job_id: queueJobId,
    job: store.getJob(job.id),
  });
});

/** Local export path handoff / download stream. */
jobsRouter.get("/:id/export", requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const job = ownedJob(userId, req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const exports = store.listExports(job.id);
  const sceneId = typeof req.query.scene_id === "string" ? req.query.scene_id : undefined;
  const target = sceneId ? exports.find((e) => e.scene_id === sceneId) : exports[0];

  if (!target) {
    res.status(404).json({ error: "No export ready", status: job.status });
    return;
  }

  if (req.query.download === "1" || req.query.download === "true") {
    if (!fs.existsSync(target.local_path)) {
      // Stub files may be `.burn-stub.json` — stream metadata JSON if media missing.
      const stub = `${target.local_path}.burn-stub.json`;
      if (fs.existsSync(stub)) {
        res.download(stub, path.basename(stub));
        return;
      }
      res.status(404).json({
        error: "Export file not on disk yet (stub)",
        local_path: target.local_path,
      });
      return;
    }
    res.download(target.local_path, path.basename(target.local_path));
    return;
  }

  res.json({
    job_id: job.id,
    status: job.status,
    exports,
    download_hint: `/api/jobs/${job.id}/export?download=1`,
  });
});

/** SSE progress stream. */
jobsRouter.get("/:id/events", requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const job = ownedJob(userId, req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: ProgressEvent) => {
    res.write(`event: progress\ndata: ${JSON.stringify(event)}\n\n`);
  };

  send({
    jobId: job.id,
    status: job.status,
    progress_pct: job.progress_pct,
    at: new Date().toISOString(),
  });

  const unsubscribe = subscribeProgress(job.id, (event) => {
    send(event);
    if (event.status === "ready" || event.status === "failed") {
      res.write(`event: done\ndata: ${JSON.stringify(event)}\n\n`);
      unsubscribe();
      res.end();
    }
  });

  req.on("close", () => {
    unsubscribe();
  });
});

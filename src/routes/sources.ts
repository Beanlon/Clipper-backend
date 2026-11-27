import { Router } from "express";
import { z } from "zod";
import { ensureSourceDir } from "../lib/paths";
import { store } from "../lib/store";
import type { AuthedRequest } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";

export const sourcesRouter = Router();

const createSchema = z
  .object({
    kind: z.enum(["upload", "youtube"]),
    title: z.string().min(1).optional(),
    local_path: z.string().min(1).optional(),
    youtube_url: z.string().url().optional(),
    duration_ms: z.number().int().nonnegative().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "upload" && !val.local_path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "local_path required for upload sources",
        path: ["local_path"],
      });
    }
    if (val.kind === "youtube" && !val.youtube_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "youtube_url required for youtube sources",
        path: ["youtube_url"],
      });
    }
  });

/** Register local upload path or YouTube URL (metadata only). */
sourcesRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { userId } = req as AuthedRequest;
  const body = parsed.data;
  const title =
    body.title ??
    (body.kind === "youtube" ? body.youtube_url! : body.local_path!.split(/[/\\]/).pop()!) ??
    "Untitled";

  const source = store.createSource(userId, {
    kind: body.kind,
    title,
    local_path: body.local_path ?? null,
    youtube_url: body.youtube_url ?? null,
    duration_ms: body.duration_ms ?? null,
  });

  await ensureSourceDir(userId, source.id);
  res.status(201).json({ source });
});

sourcesRouter.get("/:id", requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const source = store.getSource(req.params.id);
  if (!source || source.user_id !== userId) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  res.json({ source });
});

import { emitProgress } from "../lib/progress";
import { store } from "../lib/store";
import type { PipelineJobData } from "../types";
import { burnIn } from "./burnIn";
import { cutScenes } from "./cutScenes";
import { fetchYoutube } from "./fetchYoutube";
import { packExport } from "./packExport";
import { transcribe } from "./transcribe";

/** Runs the full generate pipeline (stub stages). */
export async function runPipeline(data: PipelineJobData): Promise<void> {
  const { jobId, userId, sourceId } = data;
  const job = store.getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  try {
    await emitProgress(userId, jobId, "queued", 0, "Pipeline started");

    const sourcePath = await fetchYoutube(jobId, userId, sourceId);
    const sceneClips = await cutScenes(jobId, userId, sourcePath, job.framing);
    const captions = await transcribe(jobId, userId, sceneClips, job.language);
    const exports = await burnIn(jobId, userId, sceneClips, captions, job.caption_style);
    await packExport(jobId, userId, exports);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pipeline failed";
    await emitProgress(userId, jobId, "failed", store.getJob(jobId)?.progress_pct ?? 0, message, message);
    throw err;
  }
}

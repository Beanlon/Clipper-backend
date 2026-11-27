import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import type { JobStatus, ProgressEvent } from "../types";
import { progressPath } from "./paths";
import { store } from "./store";

const bus = new EventEmitter();
bus.setMaxListeners(100);

export function subscribeProgress(
  jobId: string,
  listener: (event: ProgressEvent) => void,
): () => void {
  const handler = (event: ProgressEvent) => {
    if (event.jobId === jobId) listener(event);
  };
  bus.on("progress", handler);
  return () => bus.off("progress", handler);
}

export async function emitProgress(
  userId: string,
  jobId: string,
  status: JobStatus,
  progress_pct: number,
  message?: string,
  error?: string | null,
): Promise<ProgressEvent> {
  store.setJobStatus(jobId, status, progress_pct, error);

  const event: ProgressEvent = {
    jobId,
    status,
    progress_pct,
    message,
    at: new Date().toISOString(),
  };

  try {
    await fs.writeFile(progressPath(userId, jobId), JSON.stringify(event, null, 2), "utf8");
  } catch {
    // Directory may not exist yet during early stub runs.
  }

  bus.emit("progress", event);
  return event;
}

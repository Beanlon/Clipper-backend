import fs from "node:fs/promises";
import { emitProgress } from "../lib/progress";
import { store } from "../lib/store";

/**
 * Stub: finalize export paths + mark job ready.
 */
export async function packExport(
  jobId: string,
  userId: string,
  exportPaths: string[],
): Promise<void> {
  await emitProgress(userId, jobId, "packing", 92, "Packing exports");

  const scenes = store.getScenes(jobId);
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const localPath = exportPaths[i]!;
    let bytes: number | null = null;
    try {
      const stat = await fs.stat(localPath);
      bytes = stat.size;
    } catch {
      bytes = null;
    }
    store.addExport({
      job_id: jobId,
      scene_id: scene.id,
      local_path: localPath,
      bytes,
    });
  }

  store.upsertScenes(
    jobId,
    scenes.map((s, i) => ({
      id: s.id,
      in_ms: s.in_ms,
      out_ms: s.out_ms,
      export_path: exportPaths[i] ?? null,
    })),
  );

  await emitProgress(userId, jobId, "ready", 100, "Export ready");
}

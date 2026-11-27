import fs from "node:fs/promises";
import { ensureJobDirs, sceneClipPath } from "../lib/paths";
import { emitProgress } from "../lib/progress";
import { store } from "../lib/store";
import type { Framing } from "../types";

/**
 * Stub: FFmpeg multi-range cut + framing crop/scale.
 */
export async function cutScenes(
  jobId: string,
  userId: string,
  sourcePath: string,
  framing: Framing,
): Promise<string[]> {
  await emitProgress(userId, jobId, "cutting", 25, `Cutting scenes (${framing})`);
  await ensureJobDirs(userId, jobId);

  const scenes = store.getScenes(jobId);
  if (scenes.length === 0) {
    throw new Error("Job has no scenes");
  }

  const outputs: string[] = [];
  for (const scene of scenes) {
    const out = sceneClipPath(userId, jobId, scene.id);
    // TODO: ffmpeg -ss in -to out -i source -vf crop/scale → out
    await fs.writeFile(
      `${out}.cut-stub.json`,
      JSON.stringify(
        {
          stub: true,
          sourcePath,
          framing,
          in_ms: scene.in_ms,
          out_ms: scene.out_ms,
          intended_path: out,
        },
        null,
        2,
      ),
      "utf8",
    );
    outputs.push(out);
  }

  await emitProgress(userId, jobId, "cutting", 40, `Cut ${scenes.length} scene(s)`);
  return outputs;
}

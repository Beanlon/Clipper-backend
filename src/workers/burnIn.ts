import fs from "node:fs/promises";
import { ensureJobDirs, exportPath } from "../lib/paths";
import { emitProgress } from "../lib/progress";
import { store } from "../lib/store";

/**
 * Stub: FFmpeg ass/srt burn-in.
 */
export async function burnIn(
  jobId: string,
  userId: string,
  sceneClipPaths: string[],
  captionPaths: string[],
  captionStyle: string,
): Promise<string[]> {
  await emitProgress(userId, jobId, "burning", 75, `Burning captions (${captionStyle})`);
  await ensureJobDirs(userId, jobId);

  const scenes = store.getScenes(jobId);
  const outputs: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const clip = sceneClipPaths[i]!;
    const caption = captionPaths[i]!;
    const out = exportPath(userId, jobId, scene.id);
    // TODO: ffmpeg -i clip -vf ass=caption → out
    await fs.writeFile(
      `${out}.burn-stub.json`,
      JSON.stringify(
        {
          stub: true,
          clip,
          caption,
          captionStyle,
          intended_path: out,
        },
        null,
        2,
      ),
      "utf8",
    );
    outputs.push(out);
  }

  await emitProgress(userId, jobId, "burning", 85, "Caption burn-in complete");
  return outputs;
}

import fs from "node:fs/promises";
import { captionPath, ensureJobDirs } from "../lib/paths";
import { emitProgress } from "../lib/progress";
import { store } from "../lib/store";
import type { CaptionLanguage } from "../types";

/**
 * Stub: faster-whisper ASR (EN | Filipino).
 */
export async function transcribe(
  jobId: string,
  userId: string,
  sceneClipPaths: string[],
  language: CaptionLanguage,
): Promise<string[]> {
  await emitProgress(userId, jobId, "transcribing", 50, `Transcribing (${language})`);
  await ensureJobDirs(userId, jobId);

  const scenes = store.getScenes(jobId);
  const captions: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const clip = sceneClipPaths[i] ?? sceneClipPaths[0]!;
    const out = captionPath(userId, jobId, scene.id, "ass");
    // TODO: spawn faster-whisper on clip → SRT/ASS
    await fs.writeFile(
      out,
      `[Stub ASS]\n; language=${language}\n; source=${clip}\nDialogue: 0,0:00:00.00,0:00:02.00,Default,,0,0,0,,Stub caption\n`,
      "utf8",
    );
    captions.push(out);
  }

  await emitProgress(userId, jobId, "transcribing", 65, "Captions drafted");
  return captions;
}

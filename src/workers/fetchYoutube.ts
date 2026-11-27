import fs from "node:fs/promises";
import { ensureSourceDir, sourceRawPath } from "../lib/paths";
import { store } from "../lib/store";
import { emitProgress } from "../lib/progress";

/**
 * Stub: yt-dlp → local cache.
 * Real impl will spawn yt-dlp into sourceRawPath.
 */
export async function fetchYoutube(jobId: string, userId: string, sourceId: string): Promise<string> {
  await emitProgress(userId, jobId, "fetching", 5, "Fetching source media");

  const source = store.getSource(sourceId);
  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  await ensureSourceDir(userId, sourceId);
  const dest = source.local_path ?? sourceRawPath(userId, sourceId, "mp4");

  if (source.kind === "youtube") {
    // TODO: yt-dlp -o dest -- source.youtube_url
    await fs.writeFile(
      `${dest}.fetch-stub.json`,
      JSON.stringify(
        {
          stub: true,
          youtube_url: source.youtube_url,
          intended_path: dest,
          note: "Replace with yt-dlp download",
        },
        null,
        2,
      ),
      "utf8",
    );
  } else if (source.local_path) {
    // Upload already registered a local path — nothing to fetch.
  } else {
    throw new Error("Upload source missing local_path");
  }

  await emitProgress(userId, jobId, "fetching", 15, "Source ready on local disk");
  return dest;
}

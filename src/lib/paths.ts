import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

/** Local-only media layout — no cloud bucket. */
export function userRoot(userId: string): string {
  return path.join(config.dataDir, "users", userId);
}

export function sourceDir(userId: string, sourceId: string): string {
  return path.join(userRoot(userId), "sources", sourceId);
}

export function sourceRawPath(userId: string, sourceId: string, ext = "mp4"): string {
  return path.join(sourceDir(userId, sourceId), `raw.${ext}`);
}

export function jobDir(userId: string, jobId: string): string {
  return path.join(userRoot(userId), "jobs", jobId);
}

export function scenesDir(userId: string, jobId: string): string {
  return path.join(jobDir(userId, jobId), "scenes");
}

export function captionsDir(userId: string, jobId: string): string {
  return path.join(jobDir(userId, jobId), "captions");
}

export function exportsDir(userId: string, jobId: string): string {
  return path.join(jobDir(userId, jobId), "exports");
}

export function sceneClipPath(userId: string, jobId: string, sceneId: string): string {
  return path.join(scenesDir(userId, jobId), `${sceneId}.mp4`);
}

export function captionPath(
  userId: string,
  jobId: string,
  sceneId: string,
  ext: "srt" | "ass" = "ass",
): string {
  return path.join(captionsDir(userId, jobId), `${sceneId}.${ext}`);
}

export function exportPath(userId: string, jobId: string, sceneId: string): string {
  return path.join(exportsDir(userId, jobId), `${sceneId}.mp4`);
}

export function progressPath(userId: string, jobId: string): string {
  return path.join(jobDir(userId, jobId), "progress.json");
}

export async function ensureJobDirs(userId: string, jobId: string): Promise<void> {
  await Promise.all([
    fs.mkdir(scenesDir(userId, jobId), { recursive: true }),
    fs.mkdir(captionsDir(userId, jobId), { recursive: true }),
    fs.mkdir(exportsDir(userId, jobId), { recursive: true }),
  ]);
}

export async function ensureSourceDir(userId: string, sourceId: string): Promise<void> {
  await fs.mkdir(sourceDir(userId, sourceId), { recursive: true });
}

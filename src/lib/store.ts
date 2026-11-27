/**
 * In-memory metadata store for API stubs.
 * Swap for Supabase table reads/writes once credentials are configured.
 */
import { randomUUID } from "node:crypto";
import type {
  ExportRecord,
  Job,
  JobStatus,
  Scene,
  Source,
} from "../types";

const sources = new Map<string, Source>();
const jobs = new Map<string, Job>();
const scenes = new Map<string, Scene[]>();
const exportsByJob = new Map<string, ExportRecord[]>();

function nowIso(): string {
  return new Date().toISOString();
}

export const store = {
  createSource(
    userId: string,
    input: Omit<Source, "id" | "user_id" | "created_at">,
  ): Source {
    const source: Source = {
      id: randomUUID(),
      user_id: userId,
      created_at: nowIso(),
      ...input,
    };
    sources.set(source.id, source);
    return source;
  },

  getSource(id: string): Source | undefined {
    return sources.get(id);
  },

  listSources(userId: string): Source[] {
    return [...sources.values()]
      .filter((s) => s.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  createJob(
    userId: string,
    input: Omit<Job, "id" | "user_id" | "created_at" | "updated_at" | "scenes">,
    initialScenes: Array<{ in_ms: number; out_ms: number }> = [],
  ): Job {
    const id = randomUUID();
    const stamp = nowIso();
    const job: Job = {
      id,
      user_id: userId,
      created_at: stamp,
      updated_at: stamp,
      ...input,
    };
    jobs.set(id, job);
    const sceneRows: Scene[] = initialScenes.map((s, idx) => ({
      id: randomUUID(),
      job_id: id,
      idx,
      in_ms: s.in_ms,
      out_ms: s.out_ms,
      export_path: null,
    }));
    scenes.set(id, sceneRows);
    return { ...job, scenes: sceneRows };
  },

  getJob(id: string): Job | undefined {
    const job = jobs.get(id);
    if (!job) return undefined;
    return { ...job, scenes: scenes.get(id) ?? [] };
  },

  listJobs(userId: string): Job[] {
    return [...jobs.values()]
      .filter((j) => j.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((j) => ({ ...j, scenes: scenes.get(j.id) ?? [] }));
  },

  updateJob(
    id: string,
    patch: Partial<Pick<Job, "status" | "progress_pct" | "error" | "framing" | "caption_style" | "language">>,
  ): Job | undefined {
    const job = jobs.get(id);
    if (!job) return undefined;
    const next: Job = {
      ...job,
      ...patch,
      updated_at: nowIso(),
    };
    jobs.set(id, next);
    return { ...next, scenes: scenes.get(id) ?? [] };
  },

  setJobStatus(id: string, status: JobStatus, progress_pct: number, error?: string | null): Job | undefined {
    return store.updateJob(id, {
      status,
      progress_pct,
      error: error === undefined ? undefined : error,
    });
  },

  upsertScenes(
    jobId: string,
    rows: Array<{ id?: string; in_ms: number; out_ms: number; export_path?: string | null }>,
  ): Scene[] | undefined {
    if (!jobs.has(jobId)) return undefined;
    const next: Scene[] = rows.map((row, idx) => ({
      id: row.id ?? randomUUID(),
      job_id: jobId,
      idx,
      in_ms: row.in_ms,
      out_ms: row.out_ms,
      export_path: row.export_path ?? null,
    }));
    scenes.set(jobId, next);
    const job = jobs.get(jobId)!;
    jobs.set(jobId, { ...job, updated_at: nowIso() });
    return next;
  },

  getScenes(jobId: string): Scene[] {
    return scenes.get(jobId) ?? [];
  },

  addExport(record: Omit<ExportRecord, "id" | "created_at">): ExportRecord {
    const row: ExportRecord = {
      id: randomUUID(),
      created_at: nowIso(),
      ...record,
    };
    const list = exportsByJob.get(record.job_id) ?? [];
    list.push(row);
    exportsByJob.set(record.job_id, list);
    return row;
  },

  listExports(jobId: string): ExportRecord[] {
    return exportsByJob.get(jobId) ?? [];
  },
};

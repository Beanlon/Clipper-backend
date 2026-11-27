export type SourceKind = "upload" | "youtube";

export type JobStatus =
  | "queued"
  | "fetching"
  | "cutting"
  | "transcribing"
  | "burning"
  | "packing"
  | "ready"
  | "failed";

export type Framing = "9:16" | "16:9" | "1:1";

export type CaptionLanguage = "en" | "fil";

export interface Profile {
  id: string;
  display_name: string | null;
}

export interface Source {
  id: string;
  user_id: string;
  kind: SourceKind;
  title: string;
  local_path: string | null;
  youtube_url: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface Scene {
  id: string;
  job_id: string;
  idx: number;
  in_ms: number;
  out_ms: number;
  export_path: string | null;
}

export interface Job {
  id: string;
  user_id: string;
  source_id: string;
  status: JobStatus;
  framing: Framing;
  caption_style: string;
  language: CaptionLanguage;
  progress_pct: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  scenes?: Scene[];
}

export interface ExportRecord {
  id: string;
  job_id: string;
  scene_id: string;
  local_path: string;
  bytes: number | null;
  created_at: string;
}

export interface CreateSourceBody {
  kind: SourceKind;
  title?: string;
  /** Absolute or relative path already on disk (upload handoff). */
  local_path?: string;
  youtube_url?: string;
  duration_ms?: number;
}

export interface CreateJobBody {
  source_id: string;
  framing?: Framing;
  caption_style?: string;
  language?: CaptionLanguage;
  scenes?: Array<{ in_ms: number; out_ms: number }>;
}

export interface UpsertScenesBody {
  scenes: Array<{ id?: string; in_ms: number; out_ms: number }>;
}

export interface PipelineJobData {
  jobId: string;
  userId: string;
  sourceId: string;
}

export interface ProgressEvent {
  jobId: string;
  status: JobStatus;
  progress_pct: number;
  message?: string;
  at: string;
}

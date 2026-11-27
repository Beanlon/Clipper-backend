import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function envOptional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  dataDir: path.resolve(process.env.CLIPPER_DATA_DIR ?? "./.clipper-data"),
  redisUrl: envOptional("REDIS_URL", "redis://127.0.0.1:6379"),
  supabaseUrl: envOptional("SUPABASE_URL"),
  supabaseAnonKey: envOptional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: envOptional("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseJwtSecret: envOptional("SUPABASE_JWT_SECRET"),
  /** When true, accept `Bearer stub:<userId>` without verifying Supabase. */
  authStub: (process.env.AUTH_STUB ?? "true").toLowerCase() === "true",
  pipelineQueueName: "clipper-pipeline",
} as const;

export function requireSupabaseConfigured(): void {
  env("SUPABASE_URL");
  env("SUPABASE_SERVICE_ROLE_KEY");
}

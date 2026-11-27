import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

let serviceClient: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    return null;
  }
  if (!serviceClient) {
    serviceClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

export function getAnonClient(): SupabaseClient | null {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }
  if (!anonClient) {
    anonClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

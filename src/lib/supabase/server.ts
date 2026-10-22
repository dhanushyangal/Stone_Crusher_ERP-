import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/**
 * Supabase admin client (secret key) — bypasses RLS.
 * ERP transactions still use Prisma against the same Postgres database.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createSupabasePublishable(): SupabaseClient {
  const env = getEnv();
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verifies API keys reach the Supabase project (does not prove Postgres password). */
export async function pingSupabaseApi(): Promise<{
  ok: boolean;
  projectRef?: string;
  error?: string;
}> {
  try {
    const env = getEnv();
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      return { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SECRET_KEY" };
    }
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      },
    });
    if (!res.ok) {
      return { ok: false, error: `REST status ${res.status}` };
    }
    return {
      ok: true,
      projectRef: res.headers.get("sb-project-ref") ?? undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Supabase ping failed",
    };
  }
}

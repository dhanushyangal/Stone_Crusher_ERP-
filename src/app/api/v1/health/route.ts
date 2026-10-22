import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pingSupabaseApi } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await pingSupabaseApi();

  const database: { ok: boolean; error?: string; siteCount?: number } = {
    ok: false,
  };
  try {
    const siteCount = await prisma.site.count();
    database.ok = true;
    database.siteCount = siteCount;
  } catch (error) {
    database.error =
      error instanceof Error ? error.message : "Database unreachable";
  }

  const ok = supabase.ok && database.ok;
  return NextResponse.json(
    {
      data: {
        ok,
        supabase,
        database,
        timezone: process.env.BUSINESS_TIMEZONE ?? "Asia/Kolkata",
      },
    },
    { status: ok ? 200 : 503 },
  );
}

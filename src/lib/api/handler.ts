import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth-guard";
import { jsonError, jsonOk } from "@/lib/api/errors";
import type { Permission } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth/session";

type HandlerFn = (ctx: {
  req: NextRequest;
  user: SessionUser;
  params: Record<string, string>;
}) => Promise<unknown>;

/** Mark route handlers as dynamic (cookies / auth). */
export const dynamic = "force-dynamic";

export function apiHandler(
  permission: Permission | null,
  fn: HandlerFn,
) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> },
  ) => {
    try {
      const user = await requireUser(permission ?? undefined);
      const params = context?.params ? await context.params : {};
      const data = await fn({ req, user, params });
      if (data instanceof NextResponse) {
        return data;
      }
      return jsonOk(data);
    } catch (error) {
      return jsonError(error);
    }
  };
}

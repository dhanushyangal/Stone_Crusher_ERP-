import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE, clearSessionCookie } from "@/lib/auth/session";
import { jsonOk } from "@/lib/api/errors";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySession(token);
  }
  await clearSessionCookie();
  return jsonOk({ ok: true });
}

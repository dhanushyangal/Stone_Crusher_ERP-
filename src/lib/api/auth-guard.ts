import { getSessionUserFromToken, SESSION_COOKIE, type SessionUser } from "@/lib/auth/session";
import { assertPermission, type Permission } from "@/lib/permissions";
import { AppError } from "@/lib/api/errors";
import { cookies } from "next/headers";

export async function requireUser(
  permission?: Permission,
): Promise<SessionUser> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const user = await getSessionUserFromToken(token);
  if (!user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }
  if (permission) {
    assertPermission(user.role, permission, user.permissions);
  }
  return user;
}

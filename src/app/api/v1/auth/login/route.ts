import { NextRequest } from "next/server";
import { z } from "zod";
import { loginWithPassword, setSessionCookie } from "@/lib/auth/session";
import { jsonError, jsonOk, AppError } from "@/lib/api/errors";
import { writeAudit } from "@/lib/services/audit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const result = await loginWithPassword(body.email, body.password);
    if (!result) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    await setSessionCookie(result.token);
    await writeAudit({
      siteId: result.user.siteId,
      userId: result.user.id,
      action: "auth.login",
      entityType: "user",
      entityId: result.user.id,
    });
    return jsonOk({
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        siteId: result.user.siteId,
        permissions: result.user.permissions,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

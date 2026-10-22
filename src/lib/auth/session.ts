import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { AppUser, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { permissionsForRole, type Permission } from "@/lib/permissions";

export const SESSION_COOKIE = "sc_erp_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  siteId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
};

function hashToken(token: string): string {
  return createHash("sha256")
    .update(`${token}:${getEnv().SESSION_SECRET}`)
    .digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function toSessionUser(user: AppUser): SessionUser {
  const extra = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];
  return {
    id: user.id,
    siteId: user.siteId,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: permissionsForRole(user.role, extra),
  };
}

export async function createSession(
  userId: string,
  meta?: { userAgent?: string; ipAddress?: string },
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  await prisma.appUser.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return token;
}

export async function destroySession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function getSessionUserFromToken(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  if (!session.user.isActive) {
    return null;
  }
  return toSessionUser(session.user);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return getSessionUserFromToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ user: SessionUser; token: string } | null> {
  const user = await prisma.appUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return null;
  }
  const token = await createSession(user.id);
  return { user: toSessionUser(user), token };
}

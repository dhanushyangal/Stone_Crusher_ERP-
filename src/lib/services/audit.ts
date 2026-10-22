import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  siteId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      siteId: input.siteId,
      userId: input.userId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? undefined,
      beforeJson: input.beforeJson as object | undefined,
      afterJson: input.afterJson as object | undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}

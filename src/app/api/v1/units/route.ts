import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1),
  symbol: z.string().optional(),
  allowFraction: z.boolean().optional(),
});

export const GET = apiHandler(null, async ({ user }) => {
  const units = await prisma.unit.findMany({
    where: { siteId: user.siteId, isActive: true },
    orderBy: { code: "asc" },
  });
  return { units };
});

export const POST = apiHandler("products.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const unit = await prisma.unit.create({
    data: {
      siteId: user.siteId,
      code: body.code,
      name: body.name,
      symbol: body.symbol,
      allowFraction: body.allowFraction ?? true,
    },
  });
  return { unit };
});

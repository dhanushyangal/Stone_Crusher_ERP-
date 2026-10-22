import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  description: z.string().optional(),
  billingUnitId: z.string().uuid(),
  stockUnitId: z.string().uuid(),
  defaultSellRate: z.union([z.string(), z.number()]),
  reorderThreshold: z.union([z.string(), z.number()]).optional(),
});

export const GET = apiHandler(null, async ({ user }) => {
  const products = await prisma.product.findMany({
    where: { siteId: user.siteId },
    include: { billingUnit: true, stockUnit: true },
    orderBy: { name: "asc" },
  });
  return { products };
});

export const POST = apiHandler("products.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const product = await prisma.product.create({
    data: {
      siteId: user.siteId,
      name: body.name,
      sku: body.sku,
      description: body.description,
      billingUnitId: body.billingUnitId,
      stockUnitId: body.stockUnitId,
      defaultSellRate: body.defaultSellRate,
      reorderThreshold: body.reorderThreshold,
    },
    include: { billingUnit: true, stockUnit: true },
  });
  return { product };
});

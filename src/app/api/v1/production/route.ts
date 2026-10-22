import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { createProductionDraft } from "@/lib/services/production";

const createSchema = z.object({
  clientTxnId: z.string().uuid(),
  productionDate: z.string().datetime().optional(),
  productId: z.string().uuid(),
  quantity: z.union([z.string(), z.number()]),
  unitCode: z.string().min(1),
  shift: z.string().optional(),
  rawMaterialQty: z.union([z.string(), z.number()]).optional(),
  rawMaterialUnit: z.string().optional(),
  machineLine: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = apiHandler("production.manage", async ({ user }) => {
  const entries = await prisma.productionEntry.findMany({
    where: { siteId: user.siteId },
    include: { product: true },
    orderBy: { productionDate: "desc" },
    take: 100,
  });
  return { entries };
});

export const POST = apiHandler("production.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const entry = await createProductionDraft({
    siteId: user.siteId,
    clientTxnId: body.clientTxnId,
    productionDate: body.productionDate
      ? new Date(body.productionDate)
      : new Date(),
    productId: body.productId,
    quantity: body.quantity,
    unitCode: body.unitCode,
    shift: body.shift,
    rawMaterialQty: body.rawMaterialQty,
    rawMaterialUnit: body.rawMaterialUnit,
    machineLine: body.machineLine,
    operatorId: user.id,
    notes: body.notes,
  });
  return entry;
});

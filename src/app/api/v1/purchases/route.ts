import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { createPurchaseDraft } from "@/lib/services/purchases";

const createSchema = z.object({
  clientTxnId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseDate: z.string().datetime().optional(),
  reference: z.string().optional(),
  vehicleNumber: z.string().optional(),
  notes: z.string().optional(),
  documentRef: z.string().optional(),
  affectsStock: z.boolean().optional(),
  taxAmount: z.union([z.string(), z.number()]).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.union([z.string(), z.number()]),
        unitCode: z.string(),
        rate: z.union([z.string(), z.number()]),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});

export const GET = apiHandler("purchases.manage", async ({ user }) => {
  const purchases = await prisma.purchase.findMany({
    where: { siteId: user.siteId },
    include: { supplier: true, items: { include: { product: true } } },
    orderBy: { purchaseDate: "desc" },
    take: 100,
  });
  return { purchases };
});

export const POST = apiHandler("purchases.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const purchase = await createPurchaseDraft({
    siteId: user.siteId,
    supplierId: body.supplierId,
    clientTxnId: body.clientTxnId,
    purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
    reference: body.reference,
    vehicleNumber: body.vehicleNumber,
    notes: body.notes,
    documentRef: body.documentRef,
    affectsStock: body.affectsStock,
    taxAmount: body.taxAmount,
    items: body.items,
  });
  return purchase;
});

import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { createDispatchDraft } from "@/lib/services/dispatch";

const createSchema = z.object({
  clientTxnId: z.string().uuid(),
  saleId: z.string().uuid(),
  dispatchDate: z.string().datetime().optional(),
  vehicleNumber: z.string().min(1),
  driverName: z.string().optional(),
  notes: z.string().optional(),
  allowOversell: z.boolean().optional(),
  items: z
    .array(
      z.object({
        saleItemId: z.string().uuid(),
        quantity: z.union([z.string(), z.number()]),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});

export const GET = apiHandler("dispatch.manage", async ({ user, req }) => {
  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const dispatches = await prisma.dispatch.findMany({
    where: {
      siteId: user.siteId,
      ...(q
        ? {
            OR: [
              { vehicleNumber: { contains: q, mode: "insensitive" } },
              { dispatchNumber: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      customer: true,
      sale: true,
      items: { include: { product: true } },
    },
    orderBy: { dispatchDate: "desc" },
    take: 100,
  });
  return { dispatches };
});

export const POST = apiHandler("dispatch.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const dispatch = await createDispatchDraft({
    siteId: user.siteId,
    saleId: body.saleId,
    clientTxnId: body.clientTxnId,
    dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : new Date(),
    vehicleNumber: body.vehicleNumber,
    driverName: body.driverName,
    notes: body.notes,
    operatorId: user.id,
    allowOversell: body.allowOversell,
    items: body.items,
  });
  return dispatch;
});

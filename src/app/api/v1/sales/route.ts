import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { createSaleDraft } from "@/lib/services/sales";

const createSchema = z.object({
  clientTxnId: z.string().uuid(),
  customerId: z.string().uuid(),
  saleDate: z.string().datetime().optional(),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  discountAmount: z.union([z.string(), z.number()]).optional(),
  taxAmount: z.union([z.string(), z.number()]).optional(),
  transportBasis: z.enum([
    "PER_BILLING_UNIT",
    "PER_TRIP",
    "FIXED_AMOUNT",
    "INCLUDED_IN_MATERIAL",
  ]),
  transportRate: z.union([z.string(), z.number()]),
  transportRuleId: z.string().uuid().optional(),
  transportOverrideReason: z.string().optional(),
  includedInMaterialRate: z.boolean().optional(),
  tripCount: z.number().optional(),
  provisionalRef: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.union([z.string(), z.number()]),
        unitRate: z.union([z.string(), z.number()]),
        conversionFactor: z.union([z.string(), z.number()]).optional(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
});

export const GET = apiHandler("sales.create", async ({ user, req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const customerId = url.searchParams.get("customerId") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const sales = await prisma.sale.findMany({
    where: {
      siteId: user.siteId,
      ...(status ? { status: status as never } : {}),
      ...(customerId ? { customerId } : {}),
      ...(q
        ? {
            OR: [
              { invoiceNumber: { contains: q, mode: "insensitive" } },
              { provisionalRef: { contains: q, mode: "insensitive" } },
              { vehicleNumber: { contains: q, mode: "insensitive" } },
              { customer: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { customer: true, items: { include: { product: true } } },
    orderBy: { saleDate: "desc" },
    take: 100,
  });
  return { sales };
});

export const POST = apiHandler("sales.create", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const sale = await createSaleDraft({
    siteId: user.siteId,
    customerId: body.customerId,
    clientTxnId: body.clientTxnId,
    saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
    operatorId: user.id,
    vehicleNumber: body.vehicleNumber,
    driverName: body.driverName,
    notes: body.notes,
    paymentTerms: body.paymentTerms,
    discountAmount: body.discountAmount,
    taxAmount: body.taxAmount,
    transportBasis: body.transportBasis,
    transportRate: body.transportRate,
    transportRuleId: body.transportRuleId,
    transportOverrideReason: body.transportOverrideReason,
    includedInMaterialRate: body.includedInMaterialRate,
    tripCount: body.tripCount,
    provisionalRef: body.provisionalRef,
    items: body.items,
  });
  return sale;
});

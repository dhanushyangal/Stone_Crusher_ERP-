import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { createAndPostPayment } from "@/lib/services/payments";

const createSchema = z.object({
  clientTxnId: z.string().uuid(),
  direction: z.enum(["CUSTOMER_RECEIPT", "SUPPLIER_PAYMENT"]),
  customerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  amount: z.union([z.string(), z.number()]),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  reference: z.string().optional(),
  paymentDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  allocations: z
    .array(
      z.object({
        saleId: z.string().uuid(),
        amount: z.union([z.string(), z.number()]),
        notes: z.string().optional(),
      }),
    )
    .optional(),
});

export const GET = apiHandler("payments.manage", async ({ user }) => {
  const payments = await prisma.payment.findMany({
    where: { siteId: user.siteId },
    include: { customer: true, supplier: true, allocations: true },
    orderBy: { paymentDate: "desc" },
    take: 100,
  });
  return { payments };
});

export const POST = apiHandler("payments.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const payment = await createAndPostPayment({
    siteId: user.siteId,
    clientTxnId: body.clientTxnId,
    direction: body.direction,
    customerId: body.customerId,
    supplierId: body.supplierId,
    amount: body.amount,
    method: body.method,
    reference: body.reference,
    paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
    notes: body.notes,
    operatorId: user.id,
    allocations: body.allocations,
  });
  return payment;
});

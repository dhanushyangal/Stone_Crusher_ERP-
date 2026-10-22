import type { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { add, d, money } from "@/lib/money";
import { nextDocumentNumber } from "@/lib/services/invoice";
import { writeAudit } from "@/lib/services/audit";

type Tx = Prisma.TransactionClient;

export type CreatePaymentInput = {
  siteId: string;
  clientTxnId: string;
  direction: "CUSTOMER_RECEIPT" | "SUPPLIER_PAYMENT";
  customerId?: string;
  supplierId?: string;
  amount: string | number;
  method: PaymentMethod;
  reference?: string;
  paymentDate: Date;
  notes?: string;
  operatorId?: string;
  allocations?: Array<{ saleId: string; amount: string | number; notes?: string }>;
};

export async function createAndPostPayment(input: CreatePaymentInput) {
  const existing = await prisma.payment.findUnique({
    where: {
      siteId_clientTxnId: {
        siteId: input.siteId,
        clientTxnId: input.clientTxnId,
      },
    },
    include: { allocations: true },
  });
  if (existing) {
    return existing;
  }

  if (!d(input.amount).gt(0)) {
    throw new AppError("Payment amount must be greater than zero");
  }

  if (input.direction === "CUSTOMER_RECEIPT" && !input.customerId) {
    throw new AppError("customerId is required for customer receipts");
  }
  if (input.direction === "SUPPLIER_PAYMENT" && !input.supplierId) {
    throw new AppError("supplierId is required for supplier payments");
  }

  const allocations = input.allocations ?? [];
  const allocTotal = allocations.reduce((acc, a) => add(acc, a.amount), d(0));
  if (d(allocTotal).gt(d(input.amount))) {
    throw new AppError("Allocations cannot exceed payment amount");
  }

  return prisma.$transaction(async (tx: Tx) => {
    for (const alloc of allocations) {
      if (!d(alloc.amount).gt(0)) {
        throw new AppError("Allocation amounts must be positive");
      }
      const sale = await tx.sale.findFirst({
        where: {
          id: alloc.saleId,
          siteId: input.siteId,
          customerId: input.customerId,
          status: "POSTED",
        },
        include: { allocations: true },
      });
      if (!sale) {
        throw new AppError("Allocation sale not found for customer", 404);
      }
      const already = sale.allocations.reduce(
        (acc, a) => add(acc, a.amount),
        d(0),
      );
      const remaining = d(sale.grandTotal).minus(already);
      if (d(alloc.amount).gt(remaining)) {
        throw new AppError(
          `Allocation exceeds outstanding on invoice ${sale.invoiceNumber ?? sale.id}`,
          409,
        );
      }
    }

    const receiptNumber = await nextDocumentNumber(
      tx,
      input.siteId,
      input.direction === "CUSTOMER_RECEIPT" ? "RECEIPT" : "SUPPLIER_PAY",
    );

    const payment = await tx.payment.create({
      data: {
        siteId: input.siteId,
        clientTxnId: input.clientTxnId,
        direction: input.direction,
        customerId: input.customerId,
        supplierId: input.supplierId,
        amount: money(input.amount),
        method: input.method,
        reference: input.reference,
        paymentDate: input.paymentDate,
        notes: input.notes,
        operatorId: input.operatorId,
        status: "POSTED",
        receiptNumber,
        postedAt: new Date(),
        allocations: {
          create: allocations.map((a) => ({
            saleId: a.saleId,
            amount: money(a.amount),
            notes: a.notes,
          })),
        },
      },
      include: { allocations: true, customer: true, supplier: true },
    });

    await writeAudit({
      siteId: input.siteId,
      userId: input.operatorId,
      action: "payment.post",
      entityType: "payment",
      entityId: payment.id,
      afterJson: {
        amount: payment.amount.toString(),
        receiptNumber,
      },
    });

    return payment;
  });
}

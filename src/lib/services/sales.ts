import type { Prisma, TransportBasis } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { calcSaleTotals } from "@/lib/calculations/sales";
import { money, d, qty } from "@/lib/money";
import { nextDocumentNumber } from "@/lib/services/invoice";
import { writeAudit } from "@/lib/services/audit";
import { DEFAULT_BILLING_TO_TUNE_FACTOR } from "@/lib/units";

type Tx = Prisma.TransactionClient;

export type CreateSaleInput = {
  siteId: string;
  customerId: string;
  clientTxnId: string;
  saleDate: Date;
  operatorId?: string;
  vehicleNumber?: string;
  driverName?: string;
  notes?: string;
  paymentTerms?: string;
  discountAmount?: string | number;
  taxAmount?: string | number;
  transportBasis: TransportBasis;
  transportRate: string | number;
  transportRuleId?: string;
  transportOverrideReason?: string;
  includedInMaterialRate?: boolean;
  tripCount?: number;
  provisionalRef?: string;
  items: Array<{
    productId: string;
    quantity: string | number;
    unitRate: string | number;
    conversionFactor?: string | number;
    notes?: string;
  }>;
};

async function resolveRates(
  siteId: string,
  customerId: string,
  items: CreateSaleInput["items"],
  asOf: Date,
) {
  const products = await prisma.product.findMany({
    where: {
      siteId,
      id: { in: items.map((i) => i.productId) },
      isActive: true,
    },
    include: { billingUnit: true },
  });
  if (products.length !== items.length) {
    throw new AppError("One or more products are invalid or inactive");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const rates = await prisma.customerProductRate.findMany({
    where: {
      siteId,
      customerId,
      productId: { in: items.map((i) => i.productId) },
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return items.map((item) => {
    const product = productMap.get(item.productId)!;
    const customerRate = rates.find((r) => r.productId === item.productId);
    const defaultRate = customerRate?.rate ?? product.defaultSellRate;
    const unitRate = item.unitRate ?? defaultRate;
    return {
      product,
      quantity: item.quantity,
      unitRate,
      conversionFactor: item.conversionFactor ?? DEFAULT_BILLING_TO_TUNE_FACTOR,
      notes: item.notes,
      billingUnitCode: product.billingUnit.code,
    };
  });
}

export async function createSaleDraft(input: CreateSaleInput) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, siteId: input.siteId, isActive: true },
  });
  if (!customer) {
    throw new AppError("Customer not found or inactive", 404);
  }

  const existing = await prisma.sale.findUnique({
    where: {
      siteId_clientTxnId: {
        siteId: input.siteId,
        clientTxnId: input.clientTxnId,
      },
    },
    include: { items: true },
  });
  if (existing) {
    return existing;
  }

  const resolved = await resolveRates(
    input.siteId,
    input.customerId,
    input.items,
    input.saleDate,
  );

  const totals = calcSaleTotals({
    lines: resolved.map((r) => ({
      quantity: r.quantity,
      unitRate: r.unitRate,
      conversionFactor: r.conversionFactor,
    })),
    transportBasis: input.transportBasis,
    transportRate: input.transportRate,
    tripCount: input.tripCount ?? 1,
    discountAmount: input.discountAmount ?? 0,
    taxAmount: input.taxAmount ?? 0,
    includedInMaterialRate: input.includedInMaterialRate,
  });

  return prisma.sale.create({
    data: {
      siteId: input.siteId,
      customerId: input.customerId,
      clientTxnId: input.clientTxnId,
      provisionalRef: input.provisionalRef,
      saleDate: input.saleDate,
      status: "DRAFT",
      materialSubtotal: totals.materialSubtotal,
      transportAmount: totals.transportAmount,
      transportBasis: input.transportBasis,
      transportRateSnapshot: money(input.transportRate),
      transportRuleId: input.transportRuleId,
      transportOverrideReason: input.transportOverrideReason,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      vehicleNumber: input.vehicleNumber,
      driverName: input.driverName,
      notes: input.notes,
      paymentTerms: input.paymentTerms,
      operatorId: input.operatorId,
      items: {
        create: totals.lines.map((line, idx) => ({
          productId: resolved[idx].product.id,
          quantity: qty(line.quantity),
          billingUnitCode: resolved[idx].billingUnitCode,
          unitRate: money(line.unitRate),
          lineTotal: line.lineTotal,
          conversionFactor: line.conversionFactor,
          tuneQuantity: line.tuneQuantity,
          notes: resolved[idx].notes,
        })),
      },
    },
    include: { items: true, customer: true },
  });
}

export async function postSale(saleId: string, userId: string, siteId: string) {
  return prisma.$transaction(async (tx: Tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, siteId },
      include: { items: true },
    });
    if (!sale) {
      throw new AppError("Sale not found", 404);
    }
    if (sale.status === "POSTED") {
      return sale;
    }
    if (sale.status === "CANCELLED") {
      throw new AppError("Cannot post a cancelled sale");
    }
    if (sale.items.length === 0) {
      throw new AppError("Sale has no line items");
    }

    const invoiceNumber = await nextDocumentNumber(tx, siteId, "SALE");

    const posted = await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "POSTED",
        invoiceNumber,
        postedAt: new Date(),
        provisionalRef: null,
      },
      include: { items: true, customer: true },
    });

    await writeAudit({
      siteId,
      userId,
      action: "sale.post",
      entityType: "sale",
      entityId: sale.id,
      afterJson: { invoiceNumber, grandTotal: posted.grandTotal.toString() },
    });

    return posted;
  });
}

export async function cancelSale(
  saleId: string,
  siteId: string,
  userId: string,
  reason: string,
) {
  if (!reason.trim()) {
    throw new AppError("Cancellation reason is required");
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: { id: saleId, siteId },
      include: { items: true, dispatches: true },
    });
    if (!sale) {
      throw new AppError("Sale not found", 404);
    }
    if (sale.status === "CANCELLED") {
      return sale;
    }
    if (sale.dispatches.some((d) => d.status === "POSTED")) {
      throw new AppError(
        "Cancel posted dispatches before cancelling this sale",
        409,
      );
    }

    const cancelled = await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: { items: true, customer: true },
    });

    await writeAudit({
      siteId,
      userId,
      action: "sale.cancel",
      entityType: "sale",
      entityId: sale.id,
      afterJson: { reason },
    });

    return cancelled;
  });
}

export async function getCustomerOutstanding(siteId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, siteId },
  });
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const invoices = await prisma.sale.aggregate({
    where: { siteId, customerId, status: "POSTED" },
    _sum: { grandTotal: true },
  });

  const creditNotes = await prisma.creditNote.aggregate({
    where: { siteId, customerId, status: "POSTED" },
    _sum: { amount: true },
  });

  const payments = await prisma.payment.findMany({
    where: {
      siteId,
      customerId,
      direction: "CUSTOMER_RECEIPT",
      status: "POSTED",
    },
    include: { allocations: true },
  });

  const allocated = payments.reduce(
    (acc, p) =>
      acc.plus(
        p.allocations.reduce((a, al) => a.plus(d(al.amount)), d(0)),
      ),
    d(0),
  );

  const unallocated = payments.reduce((acc, p) => {
    const allocSum = p.allocations.reduce((a, al) => a.plus(d(al.amount)), d(0));
    return acc.plus(d(p.amount).minus(allocSum));
  }, d(0));

  const outstanding = d(customer.openingBalance)
    .plus(d(invoices._sum.grandTotal ?? 0))
    .minus(d(creditNotes._sum.amount ?? 0))
    .minus(allocated)
    .minus(unallocated);

  return {
    openingBalance: money(customer.openingBalance).toFixed(2),
    postedInvoices: money(invoices._sum.grandTotal ?? 0).toFixed(2),
    creditNotes: money(creditNotes._sum.amount ?? 0).toFixed(2),
    allocatedPayments: money(allocated).toFixed(2),
    advances: money(unallocated).toFixed(2),
    outstanding: money(outstanding).toFixed(2),
  };
}

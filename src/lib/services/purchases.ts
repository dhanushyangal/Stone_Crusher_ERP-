import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { add, d, money, qty } from "@/lib/money";
import { createStockMovement } from "@/lib/services/stock";
import { writeAudit } from "@/lib/services/audit";

export type CreatePurchaseInput = {
  siteId: string;
  supplierId: string;
  clientTxnId: string;
  purchaseDate: Date;
  reference?: string;
  vehicleNumber?: string;
  notes?: string;
  documentRef?: string;
  affectsStock?: boolean;
  taxAmount?: string | number;
  items: Array<{
    productId: string;
    quantity: string | number;
    unitCode: string;
    rate: string | number;
    notes?: string;
  }>;
};

export async function createPurchaseDraft(input: CreatePurchaseInput) {
  const existing = await prisma.purchase.findUnique({
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

  const supplier = await prisma.supplier.findFirst({
    where: { id: input.supplierId, siteId: input.siteId, isActive: true },
  });
  if (!supplier) {
    throw new AppError("Supplier not found", 404);
  }

  if (input.items.length === 0) {
    throw new AppError("Purchase requires at least one line");
  }

  const lines = input.items.map((item) => {
    if (!d(item.quantity).gt(0)) {
      throw new AppError("Purchase quantity must be greater than zero");
    }
    const amount = money(d(item.quantity).times(d(item.rate)));
    return {
      productId: item.productId,
      quantity: qty(item.quantity),
      unitCode: item.unitCode,
      rate: money(item.rate),
      amount,
      notes: item.notes,
    };
  });

  const subtotal = lines.reduce((acc, l) => add(acc, l.amount), d(0));
  const taxAmount = money(input.taxAmount ?? 0);
  const grandTotal = money(add(subtotal, taxAmount));

  return prisma.purchase.create({
    data: {
      siteId: input.siteId,
      supplierId: input.supplierId,
      clientTxnId: input.clientTxnId,
      purchaseDate: input.purchaseDate,
      reference: input.reference,
      vehicleNumber: input.vehicleNumber,
      notes: input.notes,
      documentRef: input.documentRef,
      affectsStock: input.affectsStock ?? true,
      subtotal,
      taxAmount,
      grandTotal,
      status: "DRAFT",
      items: { create: lines },
    },
    include: { items: true, supplier: true },
  });
}

export async function postPurchase(id: string, siteId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findFirst({
      where: { id, siteId },
      include: { items: true },
    });
    if (!purchase) {
      throw new AppError("Purchase not found", 404);
    }
    if (purchase.status === "POSTED") {
      return purchase;
    }
    if (purchase.status === "CANCELLED") {
      throw new AppError("Cannot post cancelled purchase");
    }

    if (purchase.affectsStock) {
      for (const item of purchase.items) {
        await createStockMovement(tx, {
          siteId,
          productId: item.productId,
          movementType: "PURCHASE_RECEIPT",
          quantityDelta: item.quantity,
          unitCode: item.unitCode,
          sourceType: "purchase_item",
          sourceId: item.id,
          createdById: userId,
          notes: purchase.reference ?? undefined,
        });
      }
    }

    const posted = await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: "POSTED", postedAt: new Date() },
      include: { items: true, supplier: true },
    });

    await writeAudit({
      siteId,
      userId,
      action: "purchase.post",
      entityType: "purchase",
      entityId: purchase.id,
      afterJson: { grandTotal: posted.grandTotal.toString() },
    });

    return posted;
  });
}

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { add, d, qty, sub } from "@/lib/money";
import { createStockMovement } from "@/lib/services/stock";
import { nextDocumentNumber } from "@/lib/services/invoice";
import { writeAudit } from "@/lib/services/audit";
import { billingToTunes } from "@/lib/units";

type Tx = Prisma.TransactionClient;

export type CreateDispatchInput = {
  siteId: string;
  saleId: string;
  clientTxnId: string;
  dispatchDate: Date;
  vehicleNumber: string;
  driverName?: string;
  notes?: string;
  operatorId?: string;
  allowOversell?: boolean;
  items: Array<{
    saleItemId: string;
    quantity: string | number;
    notes?: string;
  }>;
};

export async function createDispatchDraft(input: CreateDispatchInput) {
  const existing = await prisma.dispatch.findUnique({
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

  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, siteId: input.siteId },
    include: { items: true },
  });
  if (!sale) {
    throw new AppError("Sale not found", 404);
  }
  if (sale.status !== "POSTED") {
    throw new AppError("Only posted sales can be dispatched");
  }

  const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));

  const lines = input.items.map((item) => {
    const saleItem = saleItemMap.get(item.saleItemId);
    if (!saleItem) {
      throw new AppError("Invalid sale line for dispatch");
    }
    const remaining = sub(saleItem.quantity, saleItem.dispatchedQuantity);
    if (!input.allowOversell && d(item.quantity).gt(remaining)) {
      throw new AppError(
        `Dispatch quantity exceeds remaining for product line (${remaining.toFixed(4)} remaining)`,
        409,
        "OVER_DISPATCH",
      );
    }
    const tuneQuantity = billingToTunes(
      item.quantity,
      saleItem.conversionFactor,
    );
    return {
      saleItem,
      quantity: qty(item.quantity),
      tuneQuantity,
      notes: item.notes,
    };
  });

  return prisma.dispatch.create({
    data: {
      siteId: input.siteId,
      saleId: sale.id,
      customerId: sale.customerId,
      clientTxnId: input.clientTxnId,
      dispatchDate: input.dispatchDate,
      vehicleNumber: input.vehicleNumber,
      driverName: input.driverName,
      notes: input.notes,
      operatorId: input.operatorId,
      status: "DRAFT",
      items: {
        create: lines.map((line) => ({
          saleItemId: line.saleItem.id,
          productId: line.saleItem.productId,
          quantity: line.quantity,
          unitCode: line.saleItem.billingUnitCode,
          tuneQuantity: line.tuneQuantity,
          notes: line.notes,
        })),
      },
    },
    include: { items: true, customer: true, sale: true },
  });
}

export async function postDispatch(
  dispatchId: string,
  siteId: string,
  userId: string,
  allowNegativeStock = false,
) {
  return prisma.$transaction(async (tx: Tx) => {
    const dispatch = await tx.dispatch.findFirst({
      where: { id: dispatchId, siteId },
      include: { items: true },
    });
    if (!dispatch) {
      throw new AppError("Dispatch not found", 404);
    }
    if (dispatch.status === "POSTED") {
      return dispatch;
    }
    if (dispatch.status === "CANCELLED") {
      throw new AppError("Cannot post a cancelled dispatch");
    }

    const dispatchNumber = await nextDocumentNumber(tx, siteId, "DISPATCH");

    for (const item of dispatch.items) {
      const saleItem = await tx.saleItem.findUnique({ where: { id: item.saleItemId } });
      if (!saleItem) {
        throw new AppError("Sale item missing");
      }
      const remaining = sub(saleItem.quantity, saleItem.dispatchedQuantity);
      if (d(item.quantity).gt(remaining)) {
        throw new AppError("Dispatch exceeds remaining sale quantity", 409);
      }

      await createStockMovement(tx, {
        siteId,
        productId: item.productId,
        movementType: "DISPATCH",
        quantityDelta: d(item.quantity).negated(),
        unitCode: item.unitCode,
        sourceType: "dispatch_item",
        sourceId: item.id,
        createdById: userId,
        allowNegative: allowNegativeStock,
        notes: `Dispatch ${dispatchNumber}`,
      });

      await tx.saleItem.update({
        where: { id: saleItem.id },
        data: {
          dispatchedQuantity: add(saleItem.dispatchedQuantity, item.quantity),
        },
      });
    }

    const posted = await tx.dispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "POSTED",
        dispatchNumber,
        postedAt: new Date(),
      },
      include: { items: true, customer: true },
    });

    await writeAudit({
      siteId,
      userId,
      action: "dispatch.post",
      entityType: "dispatch",
      entityId: dispatch.id,
      afterJson: { dispatchNumber },
    });

    return posted;
  });
}

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { d, qty } from "@/lib/money";
import { createStockMovement } from "@/lib/services/stock";
import { writeAudit } from "@/lib/services/audit";

export type CreateProductionInput = {
  siteId: string;
  clientTxnId: string;
  productionDate: Date;
  productId: string;
  quantity: string | number;
  unitCode: string;
  shift?: string;
  rawMaterialQty?: string | number;
  rawMaterialUnit?: string;
  machineLine?: string;
  operatorId?: string;
  notes?: string;
};

export async function createProductionDraft(input: CreateProductionInput) {
  const existing = await prisma.productionEntry.findUnique({
    where: {
      siteId_clientTxnId: {
        siteId: input.siteId,
        clientTxnId: input.clientTxnId,
      },
    },
  });
  if (existing) {
    return existing;
  }

  if (!d(input.quantity).gt(0)) {
    throw new AppError("Production quantity must be greater than zero");
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, siteId: input.siteId, isActive: true },
  });
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return prisma.productionEntry.create({
    data: {
      siteId: input.siteId,
      clientTxnId: input.clientTxnId,
      productionDate: input.productionDate,
      productId: input.productId,
      quantity: qty(input.quantity),
      unitCode: input.unitCode,
      shift: input.shift,
      rawMaterialQty: input.rawMaterialQty
        ? qty(input.rawMaterialQty)
        : undefined,
      rawMaterialUnit: input.rawMaterialUnit,
      machineLine: input.machineLine,
      operatorId: input.operatorId,
      notes: input.notes,
      status: "DRAFT",
    },
    include: { product: true },
  });
}

export async function postProduction(
  id: string,
  siteId: string,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.productionEntry.findFirst({
      where: { id, siteId },
    });
    if (!entry) {
      throw new AppError("Production entry not found", 404);
    }
    if (entry.status === "POSTED") {
      return entry;
    }
    if (entry.status === "CANCELLED") {
      throw new AppError("Cannot post cancelled production");
    }

    await createStockMovement(tx, {
      siteId,
      productId: entry.productId,
      movementType: "PRODUCTION",
      quantityDelta: entry.quantity,
      unitCode: entry.unitCode,
      sourceType: "production",
      sourceId: entry.id,
      createdById: userId,
      notes: entry.notes ?? undefined,
    });

    const posted = await tx.productionEntry.update({
      where: { id: entry.id },
      data: { status: "POSTED", postedAt: new Date() },
      include: { product: true },
    });

    await writeAudit({
      siteId,
      userId,
      action: "production.post",
      entityType: "production",
      entityId: entry.id,
      afterJson: { quantity: entry.quantity.toString() },
    });

    return posted;
  });
}

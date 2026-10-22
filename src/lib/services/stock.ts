import type { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { add, d, qty, type DecimalInput } from "@/lib/money";
import { AppError } from "@/lib/api/errors";

type Tx = Prisma.TransactionClient;

export async function getStockBalance(
  siteId: string,
  productId: string,
  client: Tx | typeof prisma = prisma,
) {
  const rows = await client.stockMovement.groupBy({
    by: ["productId"],
    where: { siteId, productId },
    _sum: { quantityDelta: true },
  });
  return qty(rows[0]?._sum.quantityDelta ?? 0);
}

export async function getStockBalances(siteId: string) {
  const rows = await prisma.stockMovement.groupBy({
    by: ["productId"],
    where: { siteId },
    _sum: { quantityDelta: true },
  });
  return Object.fromEntries(
    rows.map((r) => [r.productId, qty(r._sum.quantityDelta ?? 0).toFixed(4)]),
  );
}

export async function createStockMovement(
  tx: Tx,
  input: {
    siteId: string;
    productId: string;
    movementType: StockMovementType;
    quantityDelta: DecimalInput;
    unitCode: string;
    sourceType: string;
    sourceId: string;
    notes?: string;
    createdById?: string;
    allowNegative?: boolean;
  },
) {
  const existing = await tx.stockMovement.findUnique({
    where: {
      siteId_sourceType_sourceId_movementType: {
        siteId: input.siteId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        movementType: input.movementType,
      },
    },
  });
  if (existing) {
    return existing;
  }

  const delta = qty(input.quantityDelta);
  if (d(delta).isZero()) {
    throw new AppError("Stock movement quantity cannot be zero");
  }

  if (d(delta).lt(0) && !input.allowNegative) {
    const balance = await getStockBalance(input.siteId, input.productId, tx);
    const next = add(balance, delta);
    if (d(next).lt(0)) {
      throw new AppError(
        "Insufficient stock for this posting. Approve an adjustment if an exception is required.",
        409,
        "INSUFFICIENT_STOCK",
      );
    }
  }

  return tx.stockMovement.create({
    data: {
      siteId: input.siteId,
      productId: input.productId,
      movementType: input.movementType,
      quantityDelta: delta,
      unitCode: input.unitCode,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      notes: input.notes,
      createdById: input.createdById,
    },
  });
}

export function stockFormulaNote() {
  return "closing_stock = opening + receipts + production + returns - dispatches - adjustments(losses)";
}

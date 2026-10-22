import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/api/errors";

type Tx = Prisma.TransactionClient;

export async function nextDocumentNumber(
  tx: Tx,
  siteId: string,
  series: string,
): Promise<string> {
  const seq = await tx.invoiceSequence.findUnique({
    where: { siteId_series: { siteId, series } },
  });
  if (!seq) {
    throw new AppError(`Invoice sequence not configured: ${series}`, 500);
  }

  const updated = await tx.invoiceSequence.update({
    where: { id: seq.id },
    data: { nextNumber: { increment: 1 } },
  });

  const number = updated.nextNumber - 1;
  const padded = String(number).padStart(updated.padding, "0");
  return `${updated.prefix}${padded}`;
}

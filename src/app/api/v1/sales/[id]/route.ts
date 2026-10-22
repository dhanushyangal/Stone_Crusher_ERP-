import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";

export const GET = apiHandler("sales.create", async ({ user, params }) => {
  const sale = await prisma.sale.findFirst({
    where: { id: params.id, siteId: user.siteId },
    include: {
      customer: true,
      items: { include: { product: true } },
      dispatches: { include: { items: true } },
      allocations: { include: { payment: true } },
      operator: { select: { id: true, name: true, email: true } },
    },
  });
  if (!sale) {
    throw new AppError("Sale not found", 404);
  }
  return { sale };
});

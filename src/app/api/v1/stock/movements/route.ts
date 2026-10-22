import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";

export const GET = apiHandler("stock.view", async ({ user, req }) => {
  const productId = new URL(req.url).searchParams.get("productId") ?? undefined;
  const movements = await prisma.stockMovement.findMany({
    where: {
      siteId: user.siteId,
      ...(productId ? { productId } : {}),
    },
    include: { product: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return { movements };
});

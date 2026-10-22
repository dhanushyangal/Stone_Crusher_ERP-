import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { getStockBalances } from "@/lib/services/stock";

export const GET = apiHandler("stock.view", async ({ user }) => {
  const products = await prisma.product.findMany({
    where: { siteId: user.siteId, isActive: true },
    include: { stockUnit: true, billingUnit: true },
    orderBy: { name: "asc" },
  });
  const balances = await getStockBalances(user.siteId);
  return {
    stock: products.map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: balances[p.id] ?? "0.0000",
      unit: p.stockUnit.code,
      reorderThreshold: p.reorderThreshold?.toFixed(4) ?? null,
    })),
  };
});

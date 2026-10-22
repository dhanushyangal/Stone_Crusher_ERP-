import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { d, money } from "@/lib/money";

export const GET = apiHandler("reports.profit", async ({ user, req }) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
  const toDate = to ? new Date(to) : new Date();

  const [sales, expenses] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        siteId: user.siteId,
        status: "POSTED",
        saleDate: { gte: fromDate, lte: toDate },
      },
      _sum: { grandTotal: true, materialSubtotal: true, transportAmount: true },
    }),
    prisma.expense.aggregate({
      where: {
        siteId: user.siteId,
        status: "POSTED",
        expenseDate: { gte: fromDate, lte: toDate },
      },
      _sum: { amount: true },
    }),
  ]);

  const revenue = d(sales._sum.grandTotal ?? 0);
  const expenseTotal = d(expenses._sum.amount ?? 0);
  const estimated = money(revenue.minus(expenseTotal));

  return {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    revenue: money(revenue).toFixed(2),
    materialSubtotal: money(sales._sum.materialSubtotal ?? 0).toFixed(2),
    transportRevenue: money(sales._sum.transportAmount ?? 0).toFixed(2),
    operatingExpenses: money(expenseTotal).toFixed(2),
    estimatedOperatingResult: estimated.toFixed(2),
    label: "Estimated operating result",
    included: ["Posted sales revenue", "Posted operating expenses"],
    missing: [
      "Material COGS / production costing",
      "Depreciation",
      "Unpaid accruals (unless recorded as expenses)",
    ],
  };
});

import { prisma } from "@/lib/db";
import { d, money, formatInr } from "@/lib/money";
import { getStockBalances } from "@/lib/services/stock";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

function dayBounds(date: Date, timeZone: string) {
  const zoned = toZonedTime(date, timeZone);
  const start = fromZonedTime(startOfDay(zoned), timeZone);
  const end = fromZonedTime(endOfDay(zoned), timeZone);
  return { start, end };
}

export async function getDashboard(siteId: string, asOf = new Date()) {
  const timeZone = process.env.BUSINESS_TIMEZONE || "Asia/Kolkata";
  const { start, end } = dayBounds(asOf, timeZone);

  const [
    salesToday,
    productionToday,
    collectionsToday,
    expensesToday,
    postedSales,
    postedPurchases,
    stockBalances,
    customers,
    suppliers,
    products,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: {
        siteId,
        status: "POSTED",
        saleDate: { gte: start, lte: end },
      },
      include: { items: { include: { product: true } } },
    }),
    prisma.productionEntry.findMany({
      where: {
        siteId,
        status: "POSTED",
        productionDate: { gte: start, lte: end },
      },
      include: { product: true },
    }),
    prisma.payment.aggregate({
      where: {
        siteId,
        direction: "CUSTOMER_RECEIPT",
        status: "POSTED",
        paymentDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        siteId,
        status: "POSTED",
        expenseDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { siteId, status: "POSTED" },
      _sum: { grandTotal: true },
    }),
    prisma.purchase.aggregate({
      where: { siteId, status: "POSTED" },
      _sum: { grandTotal: true },
    }),
    getStockBalances(siteId),
    prisma.customer.findMany({ where: { siteId, isActive: true } }),
    prisma.supplier.findMany({ where: { siteId, isActive: true } }),
    prisma.product.findMany({
      where: { siteId, isActive: true },
      include: { stockUnit: true, billingUnit: true },
    }),
  ]);

  const salesAmount = salesToday.reduce(
    (acc, s) => acc.plus(d(s.grandTotal)),
    d(0),
  );

  const dispatchedByProduct: Record<
    string,
    { name: string; quantity: string; unit: string }
  > = {};
  for (const sale of salesToday) {
    for (const item of sale.items) {
      const key = item.productId;
      const prev = dispatchedByProduct[key];
      const qty = d(prev?.quantity ?? 0).plus(d(item.quantity));
      dispatchedByProduct[key] = {
        name: item.product.name,
        quantity: qty.toFixed(4),
        unit: item.billingUnitCode,
      };
    }
  }

  const productionByProduct = productionToday.map((p) => ({
    productId: p.productId,
    name: p.product.name,
    quantity: p.quantity.toFixed(4),
    unit: p.unitCode,
  }));

  // Customer outstanding (simplified aggregate)
  const customerPayments = await prisma.payment.aggregate({
    where: {
      siteId,
      direction: "CUSTOMER_RECEIPT",
      status: "POSTED",
    },
    _sum: { amount: true },
  });
  const openingCustomers = customers.reduce(
    (acc, c) => acc.plus(d(c.openingBalance)),
    d(0),
  );
  const customerOutstanding = openingCustomers
    .plus(d(postedSales._sum.grandTotal ?? 0))
    .minus(d(customerPayments._sum.amount ?? 0));

  const supplierPayments = await prisma.payment.aggregate({
    where: {
      siteId,
      direction: "SUPPLIER_PAYMENT",
      status: "POSTED",
    },
    _sum: { amount: true },
  });
  const openingSuppliers = suppliers.reduce(
    (acc, s) => acc.plus(d(s.openingBalance)),
    d(0),
  );
  const supplierOutstanding = openingSuppliers
    .plus(d(postedPurchases._sum.grandTotal ?? 0))
    .minus(d(supplierPayments._sum.amount ?? 0));

  const cashIn = d(collectionsToday._sum.amount ?? 0);
  const cashOut = d(expensesToday._sum.amount ?? 0);
  const cashBalance = cashIn.minus(cashOut);

  // Estimated operating result — revenue minus recorded operating expenses only.
  // Missing: material COGS, depreciation, unpaid accruals unless recorded.
  const estimatedProfit = salesAmount.minus(cashOut);

  const stock = products.map((p) => ({
    productId: p.id,
    name: p.name,
    sku: p.sku,
    quantity: stockBalances[p.id] ?? "0.0000",
    unit: p.stockUnit.code,
    reorderThreshold: p.reorderThreshold?.toFixed(4) ?? null,
  }));

  return {
    asOf: asOf.toISOString(),
    timezone: timeZone,
    sales: {
      amount: money(salesAmount).toFixed(2),
      amountDisplay: formatInr(salesAmount),
      count: salesToday.length,
      byProduct: Object.values(dispatchedByProduct),
    },
    production: {
      count: productionToday.length,
      byProduct: productionByProduct,
    },
    collections: {
      amount: money(collectionsToday._sum.amount ?? 0).toFixed(2),
      count: collectionsToday._count,
    },
    expenses: {
      amount: money(expensesToday._sum.amount ?? 0).toFixed(2),
      count: expensesToday._count,
    },
    outstanding: {
      customers: money(customerOutstanding).toFixed(2),
      suppliers: money(supplierOutstanding).toFixed(2),
    },
    cash: {
      balance: money(cashBalance).toFixed(2),
      note: "Based on today's posted cash collections minus today's posted expenses (opening cash sessions not yet netted).",
    },
    estimatedOperatingResult: {
      amount: money(estimatedProfit).toFixed(2),
      assumptions: [
        "Uses today's posted sales revenue minus today's posted operating expenses.",
        "Does not deduct material COGS, unpaid liabilities, or depreciation unless separately recorded.",
        "Labelled estimated until full cost data is configured.",
      ],
    },
    stock,
  };
}

import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { d } from "@/lib/money";

export const GET = apiHandler("customers.manage", async ({ user, params }) => {
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, siteId: user.siteId },
  });
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const [sales, payments, creditNotes] = await Promise.all([
    prisma.sale.findMany({
      where: { siteId: user.siteId, customerId: customer.id, status: "POSTED" },
      orderBy: { saleDate: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        siteId: user.siteId,
        customerId: customer.id,
        direction: "CUSTOMER_RECEIPT",
        status: "POSTED",
      },
      orderBy: { paymentDate: "asc" },
    }),
    prisma.creditNote.findMany({
      where: { siteId: user.siteId, customerId: customer.id, status: "POSTED" },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  type Row = {
    date: string;
    type: string;
    reference: string;
    debit: string;
    credit: string;
  };

  const rows: Row[] = [
    {
      date: customer.createdAt.toISOString(),
      type: "OPENING",
      reference: "Opening balance",
      debit: d(customer.openingBalance).gt(0)
        ? d(customer.openingBalance).toFixed(2)
        : "0.00",
      credit: d(customer.openingBalance).lt(0)
        ? d(customer.openingBalance).abs().toFixed(2)
        : "0.00",
    },
    ...sales.map((s) => ({
      date: s.saleDate.toISOString(),
      type: "INVOICE",
      reference: s.invoiceNumber ?? s.id,
      debit: d(s.grandTotal).toFixed(2),
      credit: "0.00",
    })),
    ...payments.map((p) => ({
      date: p.paymentDate.toISOString(),
      type: "RECEIPT",
      reference: p.receiptNumber ?? p.id,
      debit: "0.00",
      credit: d(p.amount).toFixed(2),
    })),
    ...creditNotes.map((c) => ({
      date: c.createdAt.toISOString(),
      type: "CREDIT_NOTE",
      reference: c.id,
      debit: "0.00",
      credit: d(c.amount).toFixed(2),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const balance = { current: d(0) };
  const ledger = rows.map((row) => {
    balance.current = balance.current.plus(d(row.debit)).minus(d(row.credit));
    return { ...row, balance: balance.current.toFixed(2) };
  });

  return { customerId: customer.id, ledger };
});

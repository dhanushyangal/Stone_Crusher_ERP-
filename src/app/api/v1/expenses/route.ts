import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { d, money } from "@/lib/money";
import { writeAudit } from "@/lib/services/audit";

const createSchema = z.object({
  clientTxnId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.union([z.string(), z.number()]),
  expenseDate: z.string().datetime().optional(),
  description: z.string().min(1),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"]),
  supplierId: z.string().uuid().optional(),
  receiptRef: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = apiHandler("expenses.manage", async ({ user }) => {
  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      where: { siteId: user.siteId },
      include: { category: true, supplier: true },
      orderBy: { expenseDate: "desc" },
      take: 100,
    }),
    prisma.expenseCategory.findMany({
      where: { siteId: user.siteId, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { expenses, categories };
});

export const POST = apiHandler("expenses.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  if (!d(body.amount).gt(0)) {
    throw new AppError("Expense amount must be greater than zero");
  }

  const existing = await prisma.expense.findUnique({
    where: {
      siteId_clientTxnId: {
        siteId: user.siteId,
        clientTxnId: body.clientTxnId,
      },
    },
  });
  if (existing) {
    return existing;
  }

  const expense = await prisma.expense.create({
    data: {
      siteId: user.siteId,
      clientTxnId: body.clientTxnId,
      categoryId: body.categoryId,
      amount: money(body.amount),
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      description: body.description,
      method: body.method,
      supplierId: body.supplierId,
      receiptRef: body.receiptRef,
      notes: body.notes,
      operatorId: user.id,
      status: "POSTED",
      postedAt: new Date(),
    },
    include: { category: true },
  });

  await writeAudit({
    siteId: user.siteId,
    userId: user.id,
    action: "expense.post",
    entityType: "expense",
    entityId: expense.id,
    afterJson: { amount: expense.amount.toString() },
  });

  return expense;
});

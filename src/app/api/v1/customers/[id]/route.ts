import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api/errors";
import { getCustomerOutstanding } from "@/lib/services/sales";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxRegistration: z.string().optional().nullable(),
  creditLimit: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler("customers.manage", async ({ user, params }) => {
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, siteId: user.siteId },
    include: {
      productRates: { include: { product: true }, orderBy: { effectiveFrom: "desc" } },
      transportRules: { orderBy: { effectiveFrom: "desc" } },
    },
  });
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  const outstanding = await getCustomerOutstanding(user.siteId, customer.id);
  return { customer, outstanding };
});

export const PATCH = apiHandler("customers.manage", async ({ user, params, req }) => {
  const body = patchSchema.parse(await req.json());
  const existing = await prisma.customer.findFirst({
    where: { id: params.id, siteId: user.siteId },
  });
  if (!existing) {
    throw new AppError("Customer not found", 404);
  }
  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      name: body.name,
      phone: body.phone === null ? null : body.phone,
      address: body.address === null ? null : body.address,
      taxRegistration: body.taxRegistration === null ? null : body.taxRegistration,
      creditLimit: body.creditLimit === null ? null : body.creditLimit,
      notes: body.notes === null ? null : body.notes,
      isActive: body.isActive,
    },
  });
  return { customer };
});

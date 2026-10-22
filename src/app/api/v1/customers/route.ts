import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxRegistration: z.string().optional(),
  openingBalance: z.union([z.string(), z.number()]).optional(),
  creditLimit: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
});

export const GET = apiHandler("customers.manage", async ({ user, req }) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const customers = await prisma.customer.findMany({
    where: {
      siteId: user.siteId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
  });
  return { customers };
});

export const POST = apiHandler("customers.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const customer = await prisma.customer.create({
    data: {
      siteId: user.siteId,
      code: body.code,
      name: body.name,
      phone: body.phone,
      address: body.address,
      taxRegistration: body.taxRegistration,
      openingBalance: body.openingBalance ?? 0,
      creditLimit: body.creditLimit,
      notes: body.notes,
    },
  });
  return { customer };
});

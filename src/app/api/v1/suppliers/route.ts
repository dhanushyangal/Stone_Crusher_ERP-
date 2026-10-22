import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxRegistration: z.string().optional(),
  openingBalance: z.union([z.string(), z.number()]).optional(),
  notes: z.string().optional(),
});

export const GET = apiHandler("suppliers.manage", async ({ user, req }) => {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const suppliers = await prisma.supplier.findMany({
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
  });
  return { suppliers };
});

export const POST = apiHandler("suppliers.manage", async ({ user, req }) => {
  const body = createSchema.parse(await req.json());
  const supplier = await prisma.supplier.create({
    data: {
      siteId: user.siteId,
      code: body.code,
      name: body.name,
      phone: body.phone,
      address: body.address,
      taxRegistration: body.taxRegistration,
      openingBalance: body.openingBalance ?? 0,
      notes: body.notes,
    },
  });
  return { supplier };
});

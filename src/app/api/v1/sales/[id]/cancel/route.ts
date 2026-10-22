import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { cancelSale } from "@/lib/services/sales";

const schema = z.object({ reason: z.string().min(3) });

export const POST = apiHandler("sales.cancel", async ({ user, params, req }) => {
  const body = schema.parse(await req.json());
  const sale = await cancelSale(params.id, user.siteId, user.id, body.reason);
  return { sale };
});

import { apiHandler } from "@/lib/api/handler";
import { postSale } from "@/lib/services/sales";

export const POST = apiHandler("sales.post", async ({ user, params }) => {
  const sale = await postSale(params.id, user.id, user.siteId);
  return { sale };
});

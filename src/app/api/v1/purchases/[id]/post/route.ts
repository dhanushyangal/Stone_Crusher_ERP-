import { apiHandler } from "@/lib/api/handler";
import { postPurchase } from "@/lib/services/purchases";

export const POST = apiHandler("purchases.manage", async ({ user, params }) => {
  const purchase = await postPurchase(params.id, user.siteId, user.id);
  return { purchase };
});

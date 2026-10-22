import { apiHandler } from "@/lib/api/handler";
import { postProduction } from "@/lib/services/production";

export const POST = apiHandler("production.manage", async ({ user, params }) => {
  const entry = await postProduction(params.id, user.siteId, user.id);
  return { entry };
});

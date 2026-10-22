import { apiHandler } from "@/lib/api/handler";
import { postDispatch } from "@/lib/services/dispatch";

export const POST = apiHandler("dispatch.manage", async ({ user, params }) => {
  const dispatch = await postDispatch(params.id, user.siteId, user.id);
  return { dispatch };
});

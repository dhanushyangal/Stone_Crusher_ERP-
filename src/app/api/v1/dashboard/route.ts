import { apiHandler } from "@/lib/api/handler";
import { getDashboard } from "@/lib/services/dashboard";

export const GET = apiHandler(null, async ({ user, req }) => {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const asOf = dateParam ? new Date(dateParam) : new Date();
  return getDashboard(user.siteId, asOf);
});

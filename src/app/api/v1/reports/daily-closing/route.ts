import { apiHandler } from "@/lib/api/handler";
import { getDashboard } from "@/lib/services/dashboard";

export const GET = apiHandler("reports.view", async ({ user, req }) => {
  const dateParam = new URL(req.url).searchParams.get("date");
  const asOf = dateParam ? new Date(dateParam) : new Date();
  const dashboard = await getDashboard(user.siteId, asOf);
  return {
    date: asOf.toISOString(),
    salesRevenue: dashboard.sales.amount,
    collections: dashboard.collections.amount,
    expenses: dashboard.expenses.amount,
    customerOutstanding: dashboard.outstanding.customers,
    supplierOutstanding: dashboard.outstanding.suppliers,
    estimatedOperatingResult: dashboard.estimatedOperatingResult,
    note: "Closing distinguishes sales revenue from cash collections and expenses.",
  };
});

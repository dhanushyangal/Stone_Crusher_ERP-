/**
 * Wipe all business data and re-apply clean bootstrap seed.
 * Usage: npx tsx scripts/reset-clean.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TABLES = [
  "payment_allocations",
  "payments",
  "dispatch_items",
  "dispatches",
  "sale_items",
  "sales",
  "credit_notes",
  "purchase_items",
  "purchases",
  "production_entries",
  "stock_count_items",
  "stock_counts",
  "stock_adjustments",
  "stock_movements",
  "expenses",
  "customer_product_rates",
  "customer_transport_rules",
  "products",
  "customers",
  "suppliers",
  "cash_sessions",
  "sync_operations",
  "registered_devices",
  "audit_logs",
  "sessions",
  "app_users",
  "expense_categories",
  "unit_conversions",
  "units",
  "invoice_sequences",
  "business_settings",
  "sites",
] as const;

async function main() {
  console.log("Clearing all tables...");
  await prisma.$executeRawUnsafe("SET session_replication_role = replica");
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
  await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT");
  console.log("Tables cleared.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

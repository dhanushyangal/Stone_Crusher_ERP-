import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Minimal bootstrap only — no demo customers, products, suppliers, or transactions.
 * Safe defaults for a clean site setup.
 */
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.log("Skipping seed in production (set ALLOW_PROD_SEED=true to override).");
    return;
  }

  console.log("Seeding clean bootstrap data...");

  const site = await prisma.site.upsert({
    where: { code: "MAIN" },
    update: {
      name: "Main Crusher Site",
      address: null,
    },
    create: {
      code: "MAIN",
      name: "Main Crusher Site",
    },
  });

  const ownerPassword =
    process.env.OWNER_SEED_PASSWORD ?? "ChangeMe@123";
  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  const owner = await prisma.appUser.upsert({
    where: { email: "owner@crusher.local" },
    update: {
      name: "Owner",
      role: UserRole.OWNER,
      passwordHash,
      isActive: true,
    },
    create: {
      siteId: site.id,
      email: "owner@crusher.local",
      name: "Owner",
      role: UserRole.OWNER,
      passwordHash,
    },
  });

  const billing = await prisma.unit.upsert({
    where: { siteId_code: { siteId: site.id, code: "BU" } },
    update: {},
    create: {
      siteId: site.id,
      code: "BU",
      name: "Billing Unit",
      symbol: "BU",
      allowFraction: true,
    },
  });

  const tune = await prisma.unit.upsert({
    where: { siteId_code: { siteId: site.id, code: "TUNE" } },
    update: {},
    create: {
      siteId: site.id,
      code: "TUNE",
      name: "Tune",
      symbol: "tune",
      allowFraction: true,
    },
  });

  await prisma.unitConversion.upsert({
    where: {
      siteId_fromUnitId_toUnitId_effectiveFrom: {
        siteId: site.id,
        fromUnitId: billing.id,
        toUnitId: tune.id,
        effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
      },
    },
    update: { factor: 4 },
    create: {
      siteId: site.id,
      fromUnitId: billing.id,
      toUnitId: tune.id,
      factor: 4,
      notes: "1 billing unit = 4 tunes",
      effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
    },
  });

  const categories = [
    ["DIESEL", "Diesel"],
    ["ELECTRICITY", "Electricity"],
    ["WAGES", "Wages"],
    ["REPAIRS", "Repairs and maintenance"],
    ["SPARES", "Spare parts"],
    ["VEHICLE", "Vehicle expenses"],
    ["TRANSPORT", "Transport"],
    ["RENT", "Rent"],
    ["ADMIN", "Administrative expenses"],
    ["OTHER", "Other"],
  ] as const;

  for (const [code, name] of categories) {
    await prisma.expenseCategory.upsert({
      where: { siteId_code: { siteId: site.id, code } },
      update: { name, isActive: true },
      create: { siteId: site.id, code, name },
    });
  }

  const sequences = [
    ["SALE", "INV-"],
    ["DISPATCH", "DC-"],
    ["RECEIPT", "RCT-"],
    ["SUPPLIER_PAY", "SP-"],
  ] as const;

  for (const [series, prefix] of sequences) {
    await prisma.invoiceSequence.upsert({
      where: { siteId_series: { siteId: site.id, series } },
      update: { prefix, nextNumber: 1, padding: 5 },
      create: { siteId: site.id, series, prefix, nextNumber: 1, padding: 5 },
    });
  }

  await prisma.businessSetting.upsert({
    where: { siteId_key: { siteId: site.id, key: "billing_to_tune_factor" } },
    update: { value: 4 },
    create: {
      siteId: site.id,
      key: "billing_to_tune_factor",
      value: 4,
    },
  });

  await prisma.businessSetting.upsert({
    where: { siteId_key: { siteId: site.id, key: "business_profile" } },
    update: {
      value: {
        name: "Main Crusher Site",
        address: "",
        phone: "",
        gstin: null,
        note: "Configure business and GST details after accountant review.",
      },
    },
    create: {
      siteId: site.id,
      key: "business_profile",
      value: {
        name: "Main Crusher Site",
        address: "",
        phone: "",
        gstin: null,
        note: "Configure business and GST details after accountant review.",
      },
    },
  });

  console.log("Clean bootstrap complete.");
  console.log(`Owner: ${owner.email}`);
  console.log("Set a strong password via OWNER_SEED_PASSWORD before seeding in shared environments.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

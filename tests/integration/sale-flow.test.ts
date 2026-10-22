import { beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createSaleDraft, postSale, getCustomerOutstanding } from "@/lib/services/sales";
import { createProductionDraft, postProduction } from "@/lib/services/production";
import { createDispatchDraft, postDispatch } from "@/lib/services/dispatch";
import { createAndPostPayment } from "@/lib/services/payments";
import { getStockBalance } from "@/lib/services/stock";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

describe("sale → production → dispatch → payment flow", () => {
  const ids = {
    siteId: "",
    userId: "",
    customerId: "",
    productId: "",
  };

  beforeAll(async () => {
    const site = await prisma.site.findFirst({ where: { code: "MAIN" } });
    const user = await prisma.appUser.findFirst({
      where: { email: "owner@crusher.local" },
    });
    if (!site || !user) {
      throw new Error("Bootstrap seed missing — run npm run db:seed first");
    }

    const billing = await prisma.unit.findFirstOrThrow({
      where: { siteId: site.id, code: "BU" },
    });

    const suffix = randomUUID().slice(0, 8);
    const customer = await prisma.customer.create({
      data: {
        siteId: site.id,
        code: `T-${suffix}`,
        name: "Test Customer",
        openingBalance: 0,
      },
    });
    const product = await prisma.product.create({
      data: {
        siteId: site.id,
        sku: `T-PROD-${suffix}`,
        name: "Test Aggregate",
        billingUnitId: billing.id,
        stockUnitId: billing.id,
        defaultSellRate: 780,
      },
    });

    ids.siteId = site.id;
    ids.userId = user.id;
    ids.customerId = customer.id;
    ids.productId = product.id;
  });

  it("posts production, sale of 5 BU (=20 tunes), dispatch, partial payment", async () => {
    const { siteId, userId, customerId, productId } = ids;

    const prod = await createProductionDraft({
      siteId,
      clientTxnId: randomUUID(),
      productionDate: new Date(),
      productId,
      quantity: 100,
      unitCode: "BU",
      operatorId: userId,
    });
    await postProduction(prod.id, siteId, userId);

    const stockBefore = await getStockBalance(siteId, productId);

    const saleClientId = randomUUID();
    const sale = await createSaleDraft({
      siteId,
      customerId,
      clientTxnId: saleClientId,
      saleDate: new Date(),
      operatorId: userId,
      transportBasis: "PER_TRIP",
      transportRate: 1500,
      tripCount: 1,
      vehicleNumber: "KA01AB1234",
      items: [{ productId, quantity: 5, unitRate: 780 }],
    });

    expect(sale.items[0].tuneQuantity.toString()).toBe("20");
    expect(sale.materialSubtotal.toString()).toBe("3900");
    expect(sale.transportAmount.toString()).toBe("1500");
    expect(sale.grandTotal.toString()).toBe("5400");

    const posted = await postSale(sale.id, userId, siteId);
    expect(posted.invoiceNumber).toBeTruthy();
    expect(posted.status).toBe("POSTED");

    const again = await createSaleDraft({
      siteId,
      customerId,
      clientTxnId: saleClientId,
      saleDate: new Date(),
      transportBasis: "PER_TRIP",
      transportRate: 1500,
      items: [{ productId, quantity: 5, unitRate: 780 }],
    });
    expect(again.id).toBe(sale.id);

    const dispatch = await createDispatchDraft({
      siteId,
      saleId: posted.id,
      clientTxnId: randomUUID(),
      dispatchDate: new Date(),
      vehicleNumber: "KA01AB1234",
      operatorId: userId,
      items: [{ saleItemId: posted.items[0].id, quantity: 5 }],
    });
    await postDispatch(dispatch.id, siteId, userId);

    const stockAfter = await getStockBalance(siteId, productId);
    expect(stockAfter.toFixed(4)).toBe(stockBefore.minus(5).toFixed(4));

    await createAndPostPayment({
      siteId,
      clientTxnId: randomUUID(),
      direction: "CUSTOMER_RECEIPT",
      customerId,
      amount: 2000,
      method: "CASH",
      paymentDate: new Date(),
      operatorId: userId,
      allocations: [{ saleId: posted.id, amount: 2000 }],
    });

    const outstanding = await getCustomerOutstanding(siteId, customerId);
    expect(Number(outstanding.outstanding)).toBeGreaterThanOrEqual(3400);
  });
});

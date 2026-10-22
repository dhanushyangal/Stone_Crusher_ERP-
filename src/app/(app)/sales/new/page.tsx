"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatInr, formatQty } from "@/lib/format";

type Customer = { id: string; name: string; phone?: string | null };
type Product = {
  id: string;
  name: string;
  sku: string;
  defaultSellRate: string;
  billingUnit: { code: string };
};

type Line = {
  key: string;
  productId: string;
  quantity: string;
  unitRate: string;
};

export default function NewSalePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transportBasis, setTransportBasis] = useState("PER_TRIP");
  const [transportRate, setTransportRate] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [lines, setLines] = useState<Line[]>([
    { key: crypto.randomUUID(), productId: "", quantity: "5", unitRate: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [clientTxnId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    void (async () => {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/v1/customers", { credentials: "include" }),
        fetch("/api/v1/products", { credentials: "include" }),
      ]);
      const cJson = await cRes.json();
      const pJson = await pRes.json();
      if (cRes.ok) {
        setCustomers(cJson.data.customers);
        if (cJson.data.customers[0]) {
          setCustomerId(cJson.data.customers[0].id);
        }
      }
      if (pRes.ok) {
        setProducts(pJson.data.products);
      }
    })();
  }, []);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) {
          return line;
        }
        const next = { ...line, ...patch };
        if (patch.productId) {
          const product = products.find((p) => p.id === patch.productId);
          if (product && !line.unitRate) {
            next.unitRate = String(product.defaultSellRate);
          }
        }
        return next;
      }),
    );
  }

  const preview = lines.map((line) => {
    const qty = Number(line.quantity || 0);
    const rate = Number(line.unitRate || 0);
    const product = products.find((p) => p.id === line.productId);
    return {
      ...line,
      product,
      lineTotal: qty * rate,
      tunes: qty * 4,
      unit: product?.billingUnit.code ?? "BU",
    };
  });
  const material = preview.reduce((a, l) => a + l.lineTotal, 0);
  const transport =
    transportBasis === "INCLUDED_IN_MATERIAL" ? 0 : Number(transportRate || 0);
  const discount = Number(discountAmount || 0);
  const grand = material + transport - discount;

  async function submit(andPost: boolean) {
    if (!navigator.onLine) {
      toast.error("No internet — reconnect to save a sale");
      return;
    }
    if (!customerId) {
      toast.error("Select a customer");
      return;
    }
    if (preview.some((l) => !l.productId || Number(l.quantity) <= 0)) {
      toast.error("Add valid product lines");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        clientTxnId,
        customerId,
        vehicleNumber,
        driverName,
        transportBasis,
        transportRate,
        discountAmount,
        items: preview.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitRate: l.unitRate,
          conversionFactor: 4,
        })),
      };

      const res = await fetch("/api/v1/sales", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not save sale");
        return;
      }
      const draftSale = json.data;

      if (andPost) {
        const postRes = await fetch(`/api/v1/sales/${draftSale.id}/post`, {
          method: "POST",
          credentials: "include",
        });
        const postJson = await postRes.json();
        if (!postRes.ok) {
          toast.error(postJson?.error?.message ?? "Saved as draft; post failed");
          router.push(`/sales/${draftSale.id}`);
          return;
        }
        const postedSale = postJson.data.sale;
        toast.success(`Posted ${postedSale.invoiceNumber}`);
        router.push(`/sales/${postedSale.id}`);
        return;
      }
      toast.success("Draft saved");
      router.push(`/sales/${draftSale.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed — check your connection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
          New sale
        </h1>
        <p className="text-sm text-stone-600">
          Requires internet. Official invoice number is issued when you post.
        </p>
      </div>

      <Card className="space-y-4">
        <div>
          <Label>Customer</Label>
          <select
            className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Vehicle number</Label>
            <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
          </div>
          <div>
            <Label>Driver name</Label>
            <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Products</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    key: crypto.randomUUID(),
                    productId: "",
                    quantity: "1",
                    unitRate: "",
                  },
                ])
              }
            >
              Add line
            </Button>
          </div>
          {lines.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            const tunes = Number(line.quantity || 0) * 4;
            return (
              <div key={line.key} className="rounded-lg border border-stone-200 p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Label>Product</Label>
                    <select
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
                      value={line.productId}
                      onChange={(e) =>
                        updateLine(line.key, {
                          productId: e.target.value,
                          unitRate: String(
                            products.find((p) => p.id === e.target.value)
                              ?.defaultSellRate ?? "",
                          ),
                        })
                      }
                    >
                      <option value="">Select…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Qty ({product?.billingUnit.code ?? "BU"})</Label>
                    <Input
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Rate ₹</Label>
                    <Input
                      inputMode="decimal"
                      value={line.unitRate}
                      onChange={(e) => updateLine(line.key, { unitRate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Tunes (×4)</Label>
                    <Input value={formatQty(tunes, "TUNE")} readOnly />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Transport basis</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
              value={transportBasis}
              onChange={(e) => setTransportBasis(e.target.value)}
            >
              <option value="PER_TRIP">Per trip</option>
              <option value="PER_BILLING_UNIT">Per billing unit</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
              <option value="INCLUDED_IN_MATERIAL">Included in material</option>
            </select>
          </div>
          <div>
            <Label>Transport ₹</Label>
            <Input
              inputMode="decimal"
              value={transportRate}
              onChange={(e) => setTransportRate(e.target.value)}
            />
          </div>
          <div>
            <Label>Discount ₹</Label>
            <Input
              inputMode="decimal"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg bg-stone-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Material</span>
            <span>{formatInr(material)}</span>
          </div>
          <div className="flex justify-between">
            <span>Transport</span>
            <span>{formatInr(transport)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatInr(discount)}</span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatInr(grand)}</span>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            Preview only — server recalculates authoritative totals on save.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => void submit(false)} variant="secondary">
            Save draft
          </Button>
          <Button disabled={saving} onClick={() => void submit(true)} variant="accent">
            Save & post invoice
          </Button>
        </div>
      </Card>
    </div>
  );
}

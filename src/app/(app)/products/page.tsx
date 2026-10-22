"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

type Unit = { id: string; code: string; name: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  defaultSellRate: string;
  billingUnit: { code: string };
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [defaultSellRate, setDefaultSellRate] = useState("");
  const [unitId, setUnitId] = useState("");

  async function load() {
    const [pRes, uRes] = await Promise.all([
      fetch("/api/v1/products", { credentials: "include" }),
      fetch("/api/v1/units", { credentials: "include" }),
    ]);
    const pJson = await pRes.json();
    const uJson = await uRes.json();
    if (pRes.ok) {
      setProducts(pJson.data.products);
    }
    if (uRes.ok) {
      setUnits(uJson.data.units);
      const billing = uJson.data.units.find((u: Unit) => u.code === "BU");
      if (!unitId && billing) {
        setUnitId(billing.id);
      } else if (!unitId && uJson.data.units[0]) {
        setUnitId(uJson.data.units[0].id);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) {
      toast.error("No billing unit available. Run seed first.");
      return;
    }
    const res = await fetch("/api/v1/products", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku,
        name,
        billingUnitId: unitId,
        stockUnitId: unitId,
        defaultSellRate,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Could not create product");
      return;
    }
    toast.success("Product created");
    setSku("");
    setName("");
    setDefaultSellRate("");
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
          Products
        </h1>
        <p className="text-stone-600">
          Add materials you sell (dust, aggregates, etc.). Quantities use billing
          units; 1 BU = 4 tunes.
        </p>
      </div>

      <Card>
        <form className="grid gap-3 sm:grid-cols-5" onSubmit={createProduct}>
          <div>
            <Label>SKU / code</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. AGG20"
              required
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 20 mm Aggregate"
              required
            />
          </div>
          <div>
            <Label>Default rate ₹</Label>
            <Input
              inputMode="decimal"
              value={defaultSellRate}
              onChange={(e) => setDefaultSellRate(e.target.value)}
              placeholder="1000"
              required
            />
          </div>
          <div>
            <Label>Unit</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" variant="accent">
              Add product
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Billing unit</th>
              <th className="px-3 py-2">Default rate</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.sku}</td>
                <td className="px-3 py-2 font-semibold">{p.name}</td>
                <td className="px-3 py-2">{p.billingUnit.code}</td>
                <td className="px-3 py-2">{formatInr(p.defaultSellRate)}</td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-stone-500">
                  No products yet — add your first material above
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

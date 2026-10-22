"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInr, statusTone } from "@/lib/format";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("100");

  async function load() {
    const [pu, su, pr] = await Promise.all([
      fetch("/api/v1/purchases", { credentials: "include" }),
      fetch("/api/v1/suppliers", { credentials: "include" }),
      fetch("/api/v1/products", { credentials: "include" }),
    ]);
    const puJson = await pu.json();
    const suJson = await su.json();
    const prJson = await pr.json();
    if (pu.ok) {
      setPurchases(puJson.data.purchases);
    }
    if (su.ok) {
      setSuppliers(suJson.data.suppliers);
      if (!supplierId && suJson.data.suppliers[0]) {
        setSupplierId(suJson.data.suppliers[0].id);
      }
    }
    if (pr.ok) {
      setProducts(prJson.data.products);
      if (!productId && prJson.data.products[0]) {
        setProductId(prJson.data.products[0].id);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/purchases", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientTxnId: crypto.randomUUID(),
        supplierId,
        items: [{ productId, quantity, unitCode: "BU", rate }],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Failed");
      return;
    }
    toast.success("Purchase draft created");
    await load();
  }

  async function post(id: string) {
    const res = await fetch(`/api/v1/purchases/${id}/post`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Post failed");
      return;
    }
    toast.success("Purchase posted");
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">Purchases</h1>
      <Card>
        <form className="grid gap-3 sm:grid-cols-5" onSubmit={create}>
          <div>
            <Label>Supplier</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 px-3"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Product</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 px-3"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Qty</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>Rate</Label>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Create draft
            </Button>
          </div>
        </form>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  {new Date(p.purchaseDate).toLocaleDateString("en-IN")}
                </td>
                <td className="px-3 py-2">{p.supplier.name}</td>
                <td className="px-3 py-2">{formatInr(p.grandTotal)}</td>
                <td className="px-3 py-2">
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  {p.status === "DRAFT" ? (
                    <Button size="sm" onClick={() => void post(p.id)}>
                      Post
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

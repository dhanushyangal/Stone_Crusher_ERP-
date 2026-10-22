"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQty, statusTone } from "@/lib/format";

export default function ProductionPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [shift, setShift] = useState("DAY");

  async function load() {
    const [eRes, pRes] = await Promise.all([
      fetch("/api/v1/production", { credentials: "include" }),
      fetch("/api/v1/products", { credentials: "include" }),
    ]);
    const eJson = await eRes.json();
    const pJson = await pRes.json();
    if (eRes.ok) {
      setEntries(eJson.data.entries);
    }
    if (pRes.ok) {
      setProducts(pJson.data.products);
      if (!productId && pJson.data.products[0]) {
        setProductId(pJson.data.products[0].id);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/production", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientTxnId: crypto.randomUUID(),
        productId,
        quantity,
        unitCode: "BU",
        shift,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Failed");
      return;
    }
    toast.success("Production draft created");
    await load();
  }

  async function post(id: string) {
    const res = await fetch(`/api/v1/production/${id}/post`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Post failed");
      return;
    }
    toast.success("Posted to stock");
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
        Production
      </h1>
      <Card>
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={createEntry}>
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
            <Label>Quantity (BU)</Label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label>Shift</Label>
            <Input value={shift} onChange={(e) => setShift(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Record
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">
                  {new Date(e.productionDate).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-2">{e.product.name}</td>
                <td className="px-3 py-2">{formatQty(e.quantity, e.unitCode)}</td>
                <td className="px-3 py-2">
                  <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  {e.status === "DRAFT" ? (
                    <Button size="sm" onClick={() => void post(e.id)}>
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

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatQty } from "@/lib/format";

export default function StockPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      const [sRes, mRes] = await Promise.all([
        fetch("/api/v1/stock", { credentials: "include" }),
        fetch("/api/v1/stock/movements", { credentials: "include" }),
      ]);
      const sJson = await sRes.json();
      const mJson = await mRes.json();
      if (sRes.ok) {
        setStock(sJson.data.stock);
      }
      if (mRes.ok) {
        setMovements(mJson.data.movements);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">Stock</h1>
      <p className="text-stone-600">Ledger balances derived from posted movements only.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.productId} className="border-t">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatQty(s.quantity, s.unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-left">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Delta</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">
                    {new Date(m.createdAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2">{m.product.name}</td>
                  <td className="px-3 py-2">{m.movementType}</td>
                  <td className="px-3 py-2 text-right">
                    {formatQty(m.quantityDelta, m.unitCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

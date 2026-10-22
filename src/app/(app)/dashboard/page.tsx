"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardTitle, CardValue } from "@/components/ui/card";
import { formatInr, formatQty } from "@/lib/format";

type Dashboard = {
  sales: { amount: string; count: number; byProduct: Array<{ name: string; quantity: string; unit: string }> };
  production: { count: number; byProduct: Array<{ name: string; quantity: string; unit: string }> };
  collections: { amount: string; count: number };
  expenses: { amount: string; count: number };
  outstanding: { customers: string; suppliers: string };
  cash: { balance: string; note: string };
  estimatedOperatingResult: { amount: string; assumptions: string[] };
  stock: Array<{ productId: string; name: string; quantity: string; unit: string }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!navigator.onLine) {
        setError("No internet — reconnect to load the dashboard");
        return;
      }
      const res = await fetch("/api/v1/dashboard", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to load dashboard");
        return;
      }
      setData(json.data);
    })();
  }, []);

  if (error) {
    return <p className="text-red-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-stone-500">Loading today’s figures…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
          Today’s dashboard
        </h1>
        <p className="text-stone-600">Live figures from posted transactions (Asia/Kolkata).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle>Sales</CardTitle>
          <CardValue>{formatInr(data.sales.amount)}</CardValue>
          <p className="mt-1 text-sm text-stone-500">{data.sales.count} invoices</p>
        </Card>
        <Card>
          <CardTitle>Collections</CardTitle>
          <CardValue>{formatInr(data.collections.amount)}</CardValue>
          <p className="mt-1 text-sm text-stone-500">{data.collections.count} receipts</p>
        </Card>
        <Card>
          <CardTitle>Expenses</CardTitle>
          <CardValue>{formatInr(data.expenses.amount)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Est. operating result</CardTitle>
          <CardValue>{formatInr(data.estimatedOperatingResult.amount)}</CardValue>
          <p className="mt-1 text-xs text-amber-800">Estimated — see assumptions</p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle>Customer outstanding</CardTitle>
          <CardValue className="text-xl">{formatInr(data.outstanding.customers)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Supplier outstanding</CardTitle>
          <CardValue className="text-xl">{formatInr(data.outstanding.suppliers)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Cash movement today</CardTitle>
          <CardValue className="text-xl">{formatInr(data.cash.balance)}</CardValue>
          <p className="mt-1 text-xs text-stone-500">{data.cash.note}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Stock (ledger)</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {data.stock.map((s) => (
              <li key={s.productId} className="flex justify-between py-2 text-sm">
                <span>{s.name}</span>
                <span className="font-semibold">{formatQty(s.quantity, s.unit)}</span>
              </li>
            ))}
            {data.stock.length === 0 ? (
              <li className="py-2 text-sm text-stone-500">No products yet</li>
            ) : null}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Assumptions</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600">
            {data.estimatedOperatingResult.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link href="/customers" className="rounded-lg bg-slate-900 px-3 py-3 text-center text-sm font-semibold text-white">
              Customers
            </Link>
            <Link href="/products" className="rounded-lg bg-slate-900 px-3 py-3 text-center text-sm font-semibold text-white">
              Products
            </Link>
            <Link href="/sales/new" className="rounded-lg bg-amber-600 px-3 py-3 text-center text-sm font-semibold text-white">
              New sale
            </Link>
            <Link href="/production" className="rounded-lg border border-stone-300 bg-white px-3 py-3 text-center text-sm font-semibold">
              Production
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

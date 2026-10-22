"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatInr, statusTone } from "@/lib/format";

type Sale = {
  id: string;
  invoiceNumber: string | null;
  status: string;
  grandTotal: string;
  saleDate: string;
  customer: { name: string };
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [q, setQ] = useState("");

  async function load(query = "") {
    const res = await fetch(`/api/v1/sales${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) {
      setSales(json.data.sales);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">Sales</h1>
          <p className="text-stone-600">Draft and posted invoices</p>
        </div>
        <Link href="/sales/new">
          <Button variant="accent">New sale</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search invoice, customer, vehicle…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button onClick={() => void load(q)}>Search</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Document</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-stone-100">
                <td className="px-3 py-2">
                  {new Date(s.saleDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/sales/${s.id}`} className="font-semibold text-amber-800 underline">
                    {s.invoiceNumber ?? <span>Draft (unposted)</span>}
                  </Link>
                </td>
                <td className="px-3 py-2">{s.customer.name}</td>
                <td className="px-3 py-2">
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatInr(s.grandTotal)}</td>
              </tr>
            ))}
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
                  No sales yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

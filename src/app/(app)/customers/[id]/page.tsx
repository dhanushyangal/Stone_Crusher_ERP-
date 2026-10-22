"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      const [dRes, lRes] = await Promise.all([
        fetch(`/api/v1/customers/${params.id}`, { credentials: "include" }),
        fetch(`/api/v1/customers/${params.id}/ledger`, { credentials: "include" }),
      ]);
      const dJson = await dRes.json();
      const lJson = await lRes.json();
      if (dRes.ok) {
        setData(dJson.data);
      }
      if (lRes.ok) {
        setLedger(lJson.data.ledger);
      }
    })();
  }, [params.id]);

  if (!data) {
    return <p className="text-stone-500">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
          {data.customer.name}
        </h1>
        <p className="text-stone-600">
          {data.customer.code} · {data.customer.phone ?? "No phone"}
        </p>
        <p className="mt-2 text-xl font-bold">
          Outstanding: {formatInr(data.outstanding.outstanding)}
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Ref</th>
              <th className="px-3 py-2 text-right">Debit</th>
              <th className="px-3 py-2 text-right">Credit</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((row, idx) => (
              <tr key={`${row.reference}-${idx}`} className="border-t">
                <td className="px-3 py-2">
                  {new Date(row.date).toLocaleDateString("en-IN")}
                </td>
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2">{row.reference}</td>
                <td className="px-3 py-2 text-right">{formatInr(row.debit)}</td>
                <td className="px-3 py-2 text-right">{formatInr(row.credit)}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {formatInr(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

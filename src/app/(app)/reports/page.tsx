"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export default function ReportsPage() {
  const [closing, setClosing] = useState<any>(null);
  const [profit, setProfit] = useState<any>(null);

  useEffect(() => {
    void (async () => {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/v1/reports/daily-closing", { credentials: "include" }),
        fetch("/api/v1/reports/profit", { credentials: "include" }),
      ]);
      const cJson = await cRes.json();
      const pJson = await pRes.json();
      if (cRes.ok) {
        setClosing(cJson.data);
      }
      if (pRes.ok) {
        setProfit(pJson.data);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">Reports</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Daily closing</h2>
          {closing ? (
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Sales revenue</span>
                <span>{formatInr(closing.salesRevenue)}</span>
              </li>
              <li className="flex justify-between">
                <span>Collections</span>
                <span>{formatInr(closing.collections)}</span>
              </li>
              <li className="flex justify-between">
                <span>Expenses</span>
                <span>{formatInr(closing.expenses)}</span>
              </li>
              <li className="flex justify-between">
                <span>Customer outstanding</span>
                <span>{formatInr(closing.customerOutstanding)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-2 text-stone-500">Loading…</p>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold">Estimated operating result</h2>
          {profit ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-2xl font-bold">
                {formatInr(profit.estimatedOperatingResult)}
              </p>
              <p className="text-amber-800">{profit.label}</p>
              <p className="font-medium">Included</p>
              <ul className="list-disc pl-5">
                {profit.included.map((i: string) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="font-medium">Missing / incomplete</p>
              <ul className="list-disc pl-5">
                {profit.missing.map((i: string) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-2 text-stone-500">Loading…</p>
          )}
        </Card>
      </div>
    </div>
  );
}

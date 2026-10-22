"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");

  async function load() {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/v1/payments", { credentials: "include" }),
      fetch("/api/v1/customers", { credentials: "include" }),
    ]);
    const pJson = await pRes.json();
    const cJson = await cRes.json();
    if (pRes.ok) {
      setPayments(pJson.data.payments);
    }
    if (cRes.ok) {
      setCustomers(cJson.data.customers);
      if (!customerId && cJson.data.customers[0]) {
        setCustomerId(cJson.data.customers[0].id);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/payments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientTxnId: crypto.randomUUID(),
        direction: "CUSTOMER_RECEIPT",
        customerId,
        amount,
        method,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Failed");
      return;
    }
    toast.success(`Receipt ${json.data.receiptNumber}`);
    setAmount("");
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">Payments</h1>
      <Card>
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit}>
          <div>
            <Label>Customer</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 px-3"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Amount ₹</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <Label>Method</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 px-3"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" variant="accent">
              Record receipt
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  {new Date(p.paymentDate).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-2 font-semibold">{p.receiptNumber}</td>
                <td className="px-3 py-2">{p.customer?.name ?? p.supplier?.name}</td>
                <td className="px-3 py-2">{p.method}</td>
                <td className="px-3 py-2 text-right">{formatInr(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

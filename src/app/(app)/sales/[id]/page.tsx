"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatInr, formatQty, statusTone } from "@/lib/format";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<any>(null);

  async function load() {
    const res = await fetch(`/api/v1/sales/${params.id}`, { credentials: "include" });
    const json = await res.json();
    if (res.ok) {
      setSale(json.data.sale);
    }
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function post() {
    const res = await fetch(`/api/v1/sales/${params.id}/post`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Post failed");
      return;
    }
    toast.success(`Invoice ${json.data.sale.invoiceNumber}`);
    await load();
  }

  async function cancel() {
    const reason = window.prompt("Cancellation reason?");
    if (!reason) {
      return;
    }
    const res = await fetch(`/api/v1/sales/${params.id}/cancel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Cancel failed");
      return;
    }
    toast.message("Sale cancelled");
    await load();
  }

  if (!sale) {
    return <p className="text-stone-500">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
            {sale.invoiceNumber ?? "Draft sale (unposted)"}
          </h1>
          {!sale.invoiceNumber ? (
            <p className="text-amber-800">
              No invoice number yet — post the sale to issue one
            </p>
          ) : null}
          <div className="mt-2 flex gap-2">
            <Badge tone={statusTone(sale.status)}>{sale.status}</Badge>
            <span className="text-sm text-stone-600">{sale.customer.name}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {sale.status === "DRAFT" ? (
            <Button variant="accent" onClick={() => void post()}>
              Post invoice
            </Button>
          ) : null}
          {sale.status !== "CANCELLED" ? (
            <Button variant="danger" onClick={() => void cancel()}>
              Cancel
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" onClick={() => router.push("/sales")}>
            Back
          </Button>
        </div>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <div className="mb-4 hidden print:block">
          <h2 className="text-xl font-bold">Stone Crusher ERP</h2>
          <p>Sales document</p>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="py-2">Product</th>
              <th>Qty</th>
              <th>Tunes</th>
              <th>Rate</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item: any) => (
              <tr key={item.id} className="border-b border-stone-100">
                <td className="py-2">{item.product.name}</td>
                <td>{formatQty(item.quantity, item.billingUnitCode)}</td>
                <td>{formatQty(item.tuneQuantity, "TUNE")}</td>
                <td>{formatInr(item.unitRate)}</td>
                <td className="text-right">{formatInr(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Material</span>
            <span>{formatInr(sale.materialSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Transport ({sale.transportBasis})</span>
            <span>{formatInr(sale.transportAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatInr(sale.discountAmount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Grand total</span>
            <span>{formatInr(sale.grandTotal)}</span>
          </div>
        </div>
        {sale.vehicleNumber ? (
          <p className="mt-4 text-sm">Vehicle: {sale.vehicleNumber}</p>
        ) : null}
      </Card>
    </div>
  );
}

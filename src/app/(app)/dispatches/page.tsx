"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQty, statusTone } from "@/lib/format";

export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [saleId, setSaleId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  async function load() {
    const [dRes, sRes] = await Promise.all([
      fetch("/api/v1/dispatches", { credentials: "include" }),
      fetch("/api/v1/sales?status=POSTED", { credentials: "include" }),
    ]);
    const dJson = await dRes.json();
    const sJson = await sRes.json();
    if (dRes.ok) {
      setDispatches(dJson.data.dispatches);
    }
    if (sRes.ok) {
      setSales(sJson.data.sales);
      if (!saleId && sJson.data.sales[0]) {
        setSaleId(sJson.data.sales[0].id);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const sale = sales.find((s) => s.id === saleId);
    if (!sale?.items?.[0]) {
      toast.error("Selected sale has no lines");
      return;
    }
    const item = sale.items[0];
    const remaining =
      Number(item.quantity) - Number(item.dispatchedQuantity ?? 0);
    const res = await fetch("/api/v1/dispatches", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientTxnId: crypto.randomUUID(),
        saleId,
        vehicleNumber,
        items: [
          {
            saleItemId: item.id,
            quantity: remaining > 0 ? remaining : Number(item.quantity),
          },
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Failed");
      return;
    }
    toast.success("Dispatch draft created");
    await load();
  }

  async function post(id: string) {
    const res = await fetch(`/api/v1/dispatches/${id}/post`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Post failed");
      return;
    }
    toast.success(`Dispatch ${json.data.dispatch.dispatchNumber}`);
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
        Dispatches
      </h1>
      <Card>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={create}>
          <div>
            <Label>Posted sale</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 px-3"
              value={saleId}
              onChange={(e) => setSaleId(e.target.value)}
            >
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.invoiceNumber} — {s.customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Vehicle</Label>
            <Input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              required
            />
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
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {dispatches.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2">
                  {new Date(d.dispatchDate).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-2">{d.dispatchNumber ?? "—"}</td>
                <td className="px-3 py-2">{d.vehicleNumber}</td>
                <td className="px-3 py-2">{d.customer.name}</td>
                <td className="px-3 py-2">
                  {d.items
                    .map((i: any) => formatQty(i.quantity, i.unitCode))
                    .join(", ")}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  {d.status === "DRAFT" ? (
                    <Button size="sm" onClick={() => void post(d.id)}>
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

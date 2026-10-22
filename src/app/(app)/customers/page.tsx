"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  isActive: boolean;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  async function load(query = "") {
    const res = await fetch(
      `/api/v1/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      { credentials: "include" },
    );
    const json = await res.json();
    if (res.ok) {
      setCustomers(json.data.customers);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/customers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, phone }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Create failed");
      return;
    }
    toast.success("Customer created");
    setCode("");
    setName("");
    setPhone("");
    await load(q);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
        Customers
      </h1>

      <Card>
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={createCustomer}>
          <div>
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Add customer
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex gap-2">
        <Input placeholder="Search name/phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => void load(q)}>Search</Button>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left text-stone-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.code}</td>
                <td className="px-3 py-2">
                  <Link className="font-semibold text-amber-800 underline" href={`/customers/${c.id}`}>
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.phone ?? "—"}</td>
                <td className="px-3 py-2">{c.isActive ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

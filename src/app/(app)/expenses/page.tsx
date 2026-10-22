"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { formatInr } from "@/lib/format";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    const res = await fetch("/api/v1/expenses", { credentials: "include" });
    const json = await res.json();
    if (res.ok) {
      setExpenses(json.data.expenses);
      setCategories(json.data.categories);
      if (!categoryId && json.data.categories[0]) {
        setCategoryId(json.data.categories[0].id);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/expenses", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientTxnId: crypto.randomUUID(),
        categoryId,
        amount,
        description,
        method: "CASH",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json?.error?.message ?? "Failed");
      return;
    }
    toast.success("Expense recorded");
    setAmount("");
    setDescription("");
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">Expenses</h1>
      <Card>
        <form className="grid gap-3 sm:grid-cols-4" onSubmit={submit}>
          <div>
            <Label>Category</Label>
            <select
              className="h-11 w-full rounded-lg border border-stone-300 px-3"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
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
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Save expense
            </Button>
          </div>
        </form>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">
                  {new Date(e.expenseDate).toLocaleDateString("en-IN")}
                </td>
                <td className="px-3 py-2">{e.category.name}</td>
                <td className="px-3 py-2">{e.description}</td>
                <td className="px-3 py-2 text-right">{formatInr(e.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

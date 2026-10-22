"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Factory,
  ShoppingCart,
  Truck,
  Warehouse,
  Wallet,
  Receipt,
  BarChart3,
  Settings,
  UserCog,
  ScrollText,
  LogOut,
  Building2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales/new", label: "New Sale", icon: ShoppingCart },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/dispatches", label: "Dispatch", icon: Truck },
  { href: "/production", label: "Production", icon: Factory },
  { href: "/purchases", label: "Purchases", icon: Package },
  { href: "/stock", label: "Stock", icon: Warehouse },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/users", label: "Users", icon: UserCog },
  { href: "/audit", label: "Audit", icon: ScrollText },
];

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/sales/new", label: "Sale", icon: ShoppingCart },
  { href: "/customers", label: "Customer", icon: Users },
  { href: "/products", label: "Product", icon: Package },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-stone-200 bg-slate-950 text-stone-100 lg:flex">
        <div className="border-b border-slate-800 px-4 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-500">Stone Crusher</p>
          <h1 className="text-lg font-bold">ERP</h1>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-amber-600 text-white"
                    : "text-stone-300 hover:bg-slate-900 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-stone-400">{user.role}</p>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start text-stone-300 hover:bg-slate-900 hover:text-white"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 lg:hidden">
                Stone Crusher ERP
              </p>
              <p className="text-sm text-stone-600">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                })}
              </p>
            </div>
            <OfflineBanner />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-4 pb-24 lg:pb-8">{children}</main>
      </div>

      {moreOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">All menus</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-14 items-center gap-2 rounded-xl border border-stone-200 px-3 py-3 text-sm font-semibold"
                  >
                    <Icon className="h-5 w-5 text-amber-700" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white lg:hidden">
        <div className="grid grid-cols-5">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] font-semibold",
                  active ? "text-amber-700" : "text-stone-500",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-stone-500"
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}

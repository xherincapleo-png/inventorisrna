"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { useApp } from "@/lib/store-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Ringkasan",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/pos",
    label: "Kasir (POS)",
    icon: ShoppingCart,
    exact: false,
  },
  {
    href: "/dashboard/inventory",
    label: "Inventaris",
    icon: Package,
    exact: false,
  },
  {
    href: "/dashboard/movements",
    label: "Riwayat Stok",
    icon: ClipboardList,
    exact: false,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isDemoMode, isLoading, logout } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Collapsible Left Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col sticky top-0 h-screen border-r border-slate-200/80 bg-white transition-all duration-200 z-30",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        {/* Brand & Collapse Toggle */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="text-base font-bold tracking-tight text-slate-900">
                  KasirKu<span className="text-emerald-600">.id</span>
                </span>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.store_name || "Toko Berkah Mandiri"}
                </p>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            aria-label="Toggle Sidebar"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Quick Action CTA */}
        <div className="p-3">
          <Link
            href="/dashboard/pos"
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200",
              collapsed ? "h-10 w-10 mx-auto" : "w-full py-2.5 px-3"
            )}
            title="Buka Kasir Cepat"
          >
            <Zap className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Transaksi Baru</span>}
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm shadow-emerald-100/50"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-emerald-600" : "text-slate-400"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Role Badge */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {isDemoMode && !collapsed && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Mode Demo Lokal Aktif</span>
            </div>
          )}

          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl bg-slate-50 border border-slate-200/70 p-2.5",
              collapsed && "justify-center p-2"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
              {(user?.full_name || "U").slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {isLoading ? "Memuat..." : user?.full_name || "Pengguna"}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold mt-0.5",
                    user?.role === "owner"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-sky-100 text-sky-700"
                  )}
                >
                  {user?.role === "owner" ? "Owner" : "Kasir"}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            className={cn(
              "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">
                KasirKu<span className="text-emerald-600">.id</span>
              </span>
              <span
                className={cn(
                  "ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  user?.role === "owner"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-sky-100 text-sky-700"
                )}
              >
                {user?.role === "owner" ? "Owner" : "Kasir"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile / Tablet Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-emerald-600 bg-emerald-50/80 font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

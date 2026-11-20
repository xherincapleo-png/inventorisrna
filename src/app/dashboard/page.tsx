"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  Package,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/lib/store-context";
import { cn, formatRupiah } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/modals/StockAdjustmentModal";
import type { DailyChartPoint, Product } from "@/types/database";

export default function DashboardPage() {
  const { user, products, transactions, isLoading } = useApp();
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);

  const isOwner = user?.role === "owner";

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let todayRevenue = 0;
    let todayProfit = 0;
    let todayCount = 0;
    let yesterdayRevenue = 0;

    transactions.forEach((trx) => {
      const dateStr = trx.created_at.slice(0, 10);
      if (dateStr === todayStr) {
        todayRevenue += Number(trx.total_amount || 0);
        todayProfit += Number(trx.total_profit || 0);
        todayCount += 1;
      } else if (dateStr === yesterdayStr) {
        yesterdayRevenue += Number(trx.total_amount || 0);
      }
    });

    const revenueGrowthPct =
      yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : todayRevenue > 0
        ? 100
        : 0;

    const totalAssetValue = products.reduce(
      (sum, p) =>
        sum +
        p.stock * (isOwner ? Number(p.cost_price || 0) : Number(p.sell_price || 0)),
      0
    );

    const lowStockItems = products
      .filter((p) => p.stock <= p.min_stock)
      .sort((a, b) => a.stock - b.stock);

    return {
      todayRevenue,
      todayProfit,
      todayCount,
      revenueGrowthPct,
      totalAssetValue,
      lowStockItems,
    };
  }, [products, transactions, isOwner]);

  const chartData = useMemo<DailyChartPoint[]>(() => {
    const days: DailyChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
      }).format(d);

      days.push({
        date: iso,
        label,
        omzet: 0,
        laba: 0,
        transaksi: 0,
      });
    }

    const map = new Map(days.map((d) => [d.date, d]));
    transactions.forEach((trx) => {
      const key = trx.created_at.slice(0, 10);
      const target = map.get(key);
      if (target) {
        target.omzet += Number(trx.total_amount || 0);
        target.laba += Number(trx.total_profit || 0);
        target.transaksi += 1;
      }
    });

    return days;
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200/80" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-2xl bg-white border border-slate-200/80" />
          <div className="h-80 rounded-2xl bg-white border border-slate-200/80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ringkasan Toko
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Selamat datang kembali,{" "}
            <span className="font-semibold text-slate-700">
              {user?.full_name || "Pengguna"}
            </span>
            . Pantau performa penjualan dan stok secara real-time.
          </p>
        </div>

        <Link
          href="/dashboard/pos"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all"
        >
          Buka Kasir (POS)
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 4-Column Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Omzet Hari Ini */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-soft hover:shadow-card transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Omzet Hari Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3 tracking-tight">
            {formatRupiah(metrics.todayRevenue)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold",
                metrics.revenueGrowthPct >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              )}
            >
              <TrendingUp className="h-3 w-3" />
              {metrics.revenueGrowthPct >= 0 ? "+" : ""}
              {metrics.revenueGrowthPct}%
            </span>
            <span className="text-slate-400">vs kemarin</span>
          </div>
        </div>

        {/* KPI 2: Estimasi Laba Bersih (Owner) OR Total Transaksi Hari Ini (Cashier) */}
        {isOwner ? (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-soft hover:shadow-card transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Estimasi Laba Bersih
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 tracking-tight">
              {formatRupiah(metrics.todayProfit)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Berdasarkan HPP dari {metrics.todayCount} transaksi hari ini
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-soft hover:shadow-card transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Total Transaksi Hari Ini
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-3 tracking-tight">
              {metrics.todayCount} Struk
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Transaksi selesai hari ini
            </p>
          </div>
        )}

        {/* KPI 3: Total Nilai Aset Stok */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-soft hover:shadow-card transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total Nilai Aset Stok
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3 tracking-tight">
            {formatRupiah(metrics.totalAssetValue)}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {products.length} produk aktif ({isOwner ? "nilai HPP" : "nilai jual"})
          </p>
        </div>

        {/* KPI 4: Produk Stok Menipis (Clickable Filter) */}
        <Link
          href="/dashboard/inventory?status=menipis"
          className="group rounded-2xl bg-white border border-slate-200/80 p-5 shadow-soft hover:border-amber-300 hover:shadow-card transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Produk Stok Menipis
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-3 tracking-tight">
            {metrics.lowStockItems.length} Produk
          </p>
          <p className="mt-2 text-xs font-medium text-amber-600 flex items-center gap-1">
            Klik untuk lihat daftar stok
            <ArrowUpRight className="h-3.5 w-3.5" />
          </p>
        </Link>
      </div>

      {/* Analytics Chart & Low Stock Alert Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue vs Profit Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-soft flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Grafik Penjualan 7 Hari Terakhir
              </h2>
              <p className="text-xs text-slate-500">
                {isOwner
                  ? "Perbandingan Omzet Kotor vs Estimasi Laba Bersih"
                  : "Tren Omzet Penjualan Harian"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Omzet
              </span>
              {isOwner && (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                  Laba Bersih
                </span>
              )}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}rb` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatRupiah(value),
                    name === "omzet" ? "Omzet" : "Laba Bersih",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgb(15 23 42 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorOmzet)"
                />
                {isOwner && (
                  <Area
                    type="monotone"
                    dataKey="laba"
                    stroke="#0f172a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLaba)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert Panel */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Peringatan Stok
              </h2>
              <p className="text-xs text-slate-500">
                Produk dengan stok &le; batas minimum
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {metrics.lowStockItems.length}
            </span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-72 pr-1">
            {metrics.lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 text-slate-400">
                <Package className="h-8 w-8 mb-2 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-700">
                  Semua Stok Aman!
                </p>
                <p className="text-xs mt-0.5">
                  Tidak ada produk di bawah batas minimum.
                </p>
              </div>
            ) : (
              metrics.lowStockItems.map((item) => {
                const isOut = item.stock === 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                            isOut
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {isOut ? "Habis (0)" : `Sisa ${item.stock} ${item.unit}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Min: {item.min_stock}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRestockProduct(item)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
                    >
                      <ArrowDownToLine className="h-3 w-3" />
                      Restock
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Restock Modal */}
      <StockAdjustmentModal
        product={restockProduct}
        defaultType="IN"
        onClose={() => setRestockProduct(null)}
      />
    </div>
  );
}

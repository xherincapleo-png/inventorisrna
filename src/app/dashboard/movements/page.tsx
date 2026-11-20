"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "@/lib/store-context";
import { cn, formatDateTime } from "@/lib/utils";
import type { MovementType } from "@/types/database";

type TypeFilter = "ALL" | MovementType;

export default function MovementsPage() {
  const { movements } = useApp();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      const matchSearch =
        !q ||
        m.product_name.toLowerCase().includes(q) ||
        m.staff_name.toLowerCase().includes(q) ||
        m.notes.toLowerCase().includes(q);
      const matchType = typeFilter === "ALL" || m.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [movements, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Riwayat Pergerakan Stok
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Buku besar audit kronologis untuk seluruh barang masuk, penjualan kasir,
          dan penyesuaian opname.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari produk, nama staf, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "ALL", label: "Semua" },
              { id: "IN", label: "Masuk (IN)" },
              { id: "OUT", label: "Keluar (OUT)" },
              { id: "ADJUSTMENT", label: "Opname" },
            ] as { id: TypeFilter; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                typeFilter === t.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Immutable Audit Ledger Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Tanggal & Waktu</th>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4 text-center">Tipe</th>
                <th className="py-3.5 px-4 text-right">Perubahan</th>
                <th className="py-3.5 px-4 text-right">Sisa Stok</th>
                <th className="py-3.5 px-4">Staf</th>
                <th className="py-3.5 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-600">
                      Belum ada riwayat pergerakan stok.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((mov) => {
                  const isPositive = mov.qty_change > 0;
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(mov.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {mov.product_name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                            mov.type === "IN" &&
                              "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
                            mov.type === "OUT" &&
                              "bg-sky-50 text-sky-700 border border-sky-200/60",
                            mov.type === "ADJUSTMENT" &&
                              "bg-amber-50 text-amber-700 border border-amber-200/60"
                          )}
                        >
                          {mov.type === "IN" && (
                            <ArrowDownToLine className="h-3 w-3" />
                          )}
                          {mov.type === "OUT" && (
                            <ArrowUpFromLine className="h-3 w-3" />
                          )}
                          {mov.type === "ADJUSTMENT" && (
                            <SlidersHorizontal className="h-3 w-3" />
                          )}
                          {mov.type}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "py-3.5 px-4 text-right font-bold whitespace-nowrap",
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {isPositive ? `+${mov.qty_change}` : mov.qty_change}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                        {mov.remaining_stock}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {mov.staff_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                        {mov.notes || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

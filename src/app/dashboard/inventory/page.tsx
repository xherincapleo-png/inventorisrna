"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  Edit3,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useApp } from "@/lib/store-context";
import {
  calculateMarginPercent,
  cn,
  formatRupiah,
  getStockStatus,
} from "@/lib/utils";
import { ProductFormModal } from "@/components/modals/ProductFormModal";
import { StockAdjustmentModal } from "@/components/modals/StockAdjustmentModal";
import type { Product, StockStatus } from "@/types/database";

type StatusFilter = "semua" | StockStatus;

function InventoryContent() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as StatusFilter) || "semua";

  const { user, products, categories, deleteProduct } = useApp();
  const isOwner = user?.role === "owner";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("semua");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchesCat =
        categoryFilter === "semua" || p.category_id === categoryFilter;
      const status = getStockStatus(p);
      const matchesStatus =
        statusFilter === "semua" ||
        (statusFilter === "menipis"
          ? status === "menipis" || status === "habis"
          : status === statusFilter);
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Hapus produk "${product.name}" dari daftar inventaris?`
    );
    if (confirmed) {
      await deleteProduct(product.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Inventaris
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola katalog produk, pantau batas stok minimum, dan lakukan opname.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-soft space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk atau kode SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="semua">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "semua", label: "Semua" },
              { id: "aman", label: "Aman" },
              { id: "menipis", label: "Menipis" },
              { id: "habis", label: "Habis" },
            ] as { id: StatusFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-semibold transition-all",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              )}
            >
              {tab.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            Menampilkan {filteredProducts.length} dari {products.length} produk
          </span>
        </div>
      </div>

      {/* Smart Data Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Produk & SKU</th>
                <th className="py-3.5 px-4">Kategori</th>
                {isOwner && <th className="py-3.5 px-4 text-right">HPP (Modal)</th>}
                <th className="py-3.5 px-4 text-right">Harga Jual</th>
                <th className="py-3.5 px-4 text-center">Stok</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={isOwner ? 7 : 6}
                    className="py-12 text-center text-slate-400"
                  >
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-600">
                      Tidak ada produk yang cocok.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const margin = calculateMarginPercent(
                    product.cost_price,
                    product.sell_price
                  );

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">
                          {product.name}
                        </p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {product.sku} • {product.unit}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {product.category_name || "Umum"}
                        </span>
                      </td>
                      {isOwner && (
                        <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                          {formatRupiah(product.cost_price)}
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-bold text-slate-900">
                          {formatRupiah(product.sell_price)}
                        </p>
                        {isOwner && (
                          <p className="text-[11px] font-medium text-emerald-600">
                            Margin {margin}%
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-900">
                          {product.stock}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          {product.unit}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Min: {product.min_stock}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            status === "aman" &&
                              "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
                            status === "menipis" &&
                              "bg-amber-50 text-amber-700 border border-amber-200/60",
                            status === "habis" &&
                              "bg-rose-50 text-rose-700 border border-rose-200/60"
                          )}
                        >
                          {status === "aman"
                            ? "Aman"
                            : status === "menipis"
                            ? "Menipis"
                            : "Habis"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setAdjustProduct(product)}
                            title="Restock / Opname"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <ArrowDownToLine className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Stok</span>
                          </button>

                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsFormOpen(true);
                                }}
                                title="Edit Produk"
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(product)}
                                title="Hapus Produk"
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isFormOpen}
        editingProduct={editingProduct}
        onClose={() => setIsFormOpen(false)}
      />

      <StockAdjustmentModal
        product={adjustProduct}
        defaultType="IN"
        onClose={() => setAdjustProduct(null)}
      />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-56 rounded-lg bg-slate-200" />
          <div className="h-24 rounded-2xl bg-white border border-slate-200/80" />
          <div className="h-96 rounded-2xl bg-white border border-slate-200/80" />
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}

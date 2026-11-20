"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { useApp } from "@/lib/store-context";
import { calculateMarginPercent, cn, generateSKU } from "@/lib/utils";
import type { Product } from "@/types/database";

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
}

const UNITS = ["pcs", "pack", "kg", "dus", "botol", "liter"];

export function ProductFormModal({
  isOpen,
  editingProduct,
  onClose,
}: ProductFormModalProps) {
  const { categories, addProduct, updateProduct } = useApp();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("5");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setCategoryId(editingProduct.category_id || categories[0]?.id || "");
      setUnit(editingProduct.unit);
      setCostPrice(String(editingProduct.cost_price));
      setSellPrice(String(editingProduct.sell_price));
      setStock(String(editingProduct.stock));
      setMinStock(String(editingProduct.min_stock));
    } else {
      const defaultCat = categories[0];
      setName("");
      setSku(generateSKU(defaultCat?.name || "PRD"));
      setCategoryId(defaultCat?.id || "");
      setUnit("pcs");
      setCostPrice("");
      setSellPrice("");
      setStock("10");
      setMinStock("5");
    }
  }, [isOpen, editingProduct, categories]);

  if (!isOpen) return null;

  const numCost = parseFloat(costPrice) || 0;
  const numSell = parseFloat(sellPrice) || 0;
  const marginPct = calculateMarginPercent(numCost, numSell);

  const handleAutoSku = () => {
    const cat = categories.find((c) => c.id === categoryId);
    setSku(generateSKU(cat?.name || "PRD"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category_id: categoryId,
      unit,
      cost_price: numCost,
      sell_price: numSell,
      stock: parseInt(stock, 10) || 0,
      min_stock: parseInt(minStock, 10) || 0,
    };

    const ok = editingProduct
      ? await updateProduct(editingProduct.id, payload)
      : await addProduct(payload);

    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {editingProduct ? "Edit Data Produk" : "Tambah Produk Baru"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Lengkapi detail SKU, harga modal (HPP), dan harga jual.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beras Pandan Wangi 5kg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Kode SKU / Barcode <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono uppercase text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={handleAutoSku}
                  title="Generate SKU Otomatis"
                  className="shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Kategori
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Harga Modal / HPP (Rp)
              </label>
              <input
                type="number"
                min={0}
                required
                placeholder="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Harga Jual (Rp)
                </label>
                {numSell > 0 && (
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                      marginPct >= 15
                        ? "bg-emerald-50 text-emerald-700"
                        : marginPct > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    )}
                  >
                    Margin {marginPct}%
                  </span>
                )}
              </div>
              <input
                type="number"
                min={0}
                required
                placeholder="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Satuan
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Stok Saat Ini
              </label>
              <input
                type="number"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Min. Stok
              </label>
              <input
                type="number"
                min={0}
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 transition-all"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

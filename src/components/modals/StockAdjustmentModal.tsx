"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownToLine, Loader2, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/lib/store-context";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

interface StockAdjustmentModalProps {
  product: Product | null;
  defaultType?: "IN" | "ADJUSTMENT";
  onClose: () => void;
}

export function StockAdjustmentModal({
  product,
  defaultType = "IN",
  onClose,
}: StockAdjustmentModalProps) {
  const { adjustStock } = useApp();
  const [type, setType] = useState<"IN" | "ADJUSTMENT">(defaultType);
  const [direction, setDirection] = useState<"minus" | "plus">("minus");
  const [qty, setQty] = useState<string>("10");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setType(defaultType);
      setDirection("minus");
      setQty(defaultType === "IN" ? "10" : "1");
      setNotes(defaultType === "IN" ? "Restock dari supplier" : "");
    }
  }, [product, defaultType]);

  if (!product) return null;

  const numericQty = Math.max(0, parseInt(qty, 10) || 0);
  const signedDelta =
    type === "IN" ? numericQty : direction === "minus" ? -numericQty : numericQty;
  const previewStock = product.stock + signedDelta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericQty <= 0) return;
    if (!notes.trim()) return;

    setSubmitting(true);
    const ok = await adjustStock(product.id, type, signedDelta, notes);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Restock & Opname Stok
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {product.name} ({product.sku})
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setType("IN");
                if (!notes) setNotes("Restock dari supplier");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                type === "IN"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Restock (IN)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("ADJUSTMENT");
                if (notes === "Restock dari supplier") setNotes("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                type === "ADJUSTMENT"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Opname (ADJUST)
            </button>
          </div>

          {type === "ADJUSTMENT" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDirection("minus")}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors",
                  direction === "minus"
                    ? "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-600"
                )}
              >
                Kurangi Stok (-)
              </button>
              <button
                type="button"
                onClick={() => setDirection("plus")}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors",
                  direction === "plus"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600"
                )}
              >
                Tambah Selisih (+)
              </button>
            </div>
          )}

          {/* Qty input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Jumlah ({product.unit})
            </label>
            <input
              type="number"
              min={1}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Preview Stock */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-3 text-xs">
            <span className="text-slate-500">
              Stok Saat Ini:{" "}
              <strong className="text-slate-800">
                {product.stock} {product.unit}
              </strong>
            </span>
            <span className="text-slate-500">
              Stok Akhir:{" "}
              <strong
                className={cn(
                  previewStock < 0 ? "text-rose-600" : "text-emerald-600"
                )}
              >
                {previewStock} {product.unit}
              </strong>
            </span>
          </div>

          {/* Mandatory Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Catatan / Keterangan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder={
                type === "IN"
                  ? "Contoh: Restock dari PT Sumber Makmur"
                  : "Contoh: Barang rusak / kadaluwarsa / selisih opname"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || numericQty <= 0 || previewStock < 0 || !notes.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

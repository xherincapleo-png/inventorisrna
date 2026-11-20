"use client";

import React from "react";
import { CheckCircle2, Copy, Printer, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, formatRupiah } from "@/lib/utils";
import type { Transaction } from "@/types/database";

interface ReceiptModalProps {
  transaction: Transaction | null;
  storeName: string;
  onClose: () => void;
}

export function ReceiptModal({
  transaction,
  storeName,
  onClose,
}: ReceiptModalProps) {
  if (!transaction) return null;

  const buildPlainReceipt = () => {
    const lines = [
      `*${storeName.toUpperCase()}*`,
      `Struk Pembelian Digital`,
      `--------------------------------`,
      `No: ${transaction.invoice_number}`,
      `Tgl: ${formatDateTime(transaction.created_at)}`,
      `Kasir: ${transaction.cashier_name}`,
      `--------------------------------`,
      ...(transaction.items || []).map(
        (item) =>
          `${item.product_name}\n  ${item.qty} x ${formatRupiah(item.unit_price)} = ${formatRupiah(item.subtotal)}`
      ),
      `--------------------------------`,
      `Subtotal: ${formatRupiah(transaction.subtotal)}`,
      ...(transaction.discount > 0
        ? [`Diskon: -${formatRupiah(transaction.discount)}`]
        : []),
      `*TOTAL: ${formatRupiah(transaction.total_amount)}*`,
      `Bayar (${transaction.payment_method.toUpperCase()}): ${formatRupiah(transaction.amount_paid)}`,
      `Kembalian: ${formatRupiah(transaction.change_amount)}`,
      `--------------------------------`,
      `Terima kasih telah berbelanja!`,
    ];
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainReceipt());
      toast.success("Struk berhasil disalin ke clipboard.");
    } catch {
      toast.error("Gagal menyalin struk.");
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(buildPlainReceipt());
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-emerald-50/70">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-bold">Pembayaran Berhasil!</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 58mm Thermal Receipt Preview */}
        <div className="p-5 overflow-y-auto bg-slate-50/80 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-full max-w-[260px] bg-white border border-dashed border-slate-300 rounded-xl p-4 font-mono text-[11px] text-slate-800 shadow-sm space-y-2.5"
          >
            <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-900">
                {storeName}
              </p>
              <p className="text-[10px] text-slate-500">
                Struk Pembelian Resmi
              </p>
            </div>

            <div className="space-y-0.5 text-[10px] text-slate-600 pb-2 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>No. Inv</span>
                <span className="font-semibold text-slate-800">
                  {transaction.invoice_number}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal</span>
                <span>{formatDateTime(transaction.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{transaction.cashier_name}</span>
              </div>
            </div>

            <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-300">
              {(transaction.items || []).map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <p className="font-semibold text-slate-900 leading-tight">
                    {item.product_name}
                  </p>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>
                      {item.qty} x {formatRupiah(item.unit_price)}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-xs pt-1 border-t border-slate-200">
                <span>TOTAL</span>
                <span>{formatRupiah(transaction.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Bayar ({transaction.payment_method.toUpperCase()})</span>
                <span>{formatRupiah(transaction.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Kembalian</span>
                <span>{formatRupiah(transaction.change_amount)}</span>
              </div>
            </div>

            <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
              <p>Terima kasih telah berbelanja!</p>
              <p>Barang yang dibeli tidak dapat ditukar.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 active:scale-[0.98] transition-all"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak 58mm
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
            >
              <Share2 className="h-3.5 w-3.5" />
              Kirim WA
            </button>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            Salin Teks Struk
          </button>
        </div>
      </div>
    </div>
  );
}

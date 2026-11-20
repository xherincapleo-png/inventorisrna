"use client";

import React, { useMemo, useState } from "react";
import {
  Banknote,
  Barcode,
  CreditCard,
  Loader2,
  Minus,
  PackageX,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store-context";
import { cn, formatRupiah, getStockStatus } from "@/lib/utils";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type {
  CartItem,
  PaymentMethod,
  Product,
  Transaction,
} from "@/types/database";

export default function PosPage() {
  const { user, products, categories, processCheckout } = useApp();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [receiptTrx, setReceiptTrx] = useState<Transaction | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      const matchCat =
        selectedCategory === "semua" || p.category_id === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          toast.warning(`Stok "${product.name}" maksimal ${product.stock} ${product.unit}.`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.qty + delta;
          if (nextQty > item.product.stock) {
            toast.warning(
              `Stok "${item.product.name}" hanya tersisa ${item.product.stock}.`
            );
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = search.trim().toLowerCase();
    if (!code) return;
    const exact = products.find((p) => p.sku.toLowerCase() === code);
    if (exact) {
      if (exact.stock > 0) {
        addToCart(exact);
        setSearch("");
        toast.success(`${exact.name} ditambahkan ke keranjang.`);
      } else {
        toast.error(`Stok "${exact.name}" sedang habis.`);
      }
    }
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sell_price * item.qty, 0),
    [cart]
  );
  const discount = Math.max(
    0,
    Math.min(parseFloat(discountInput) || 0, subtotal)
  );
  const totalAmount = Math.max(0, subtotal - discount);
  const amountPaid =
    paymentMethod === "tunai"
      ? parseFloat(amountPaidInput) || 0
      : totalAmount;
  const changeAmount = Math.max(0, amountPaid - totalAmount);
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "tunai" && amountPaid < totalAmount) {
      toast.error("Nominal bayar tunai kurang dari total tagihan.");
      return;
    }

    setIsCheckingOut(true);
    const trx = await processCheckout({
      items: cart,
      discount,
      payment_method: paymentMethod,
      amount_paid: amountPaid,
    });
    setIsCheckingOut(false);

    if (trx) {
      setCart([]);
      setDiscountInput("");
      setAmountPaidInput("");
      setMobileCartOpen(false);
      setReceiptTrx(trx);
    }
  };

  const renderCartContent = () => (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Keranjang Belanja
          </h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            {totalItems}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => setCart([])}
            className="text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors"
          >
            Kosongkan
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center text-slate-400">
            <ShoppingBag className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-600">
              Keranjang Kosong
            </p>
            <p className="text-xs mt-0.5">
              Klik produk di sebelah kiri atau scan barcode SKU.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {item.product.name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatRupiah(item.product.sell_price)} / {item.product.unit}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQty(item.product.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-7 text-center text-xs font-bold text-slate-900">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(item.product.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id)}
                  className="ml-1 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment & Totals Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3.5">
        {/* Optional Discount */}
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs font-medium text-slate-600">
            Diskon (Rp)
          </label>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={discountInput}
            onChange={(e) => setDiscountInput(e.target.value)}
            className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: "tunai", label: "Tunai", icon: Banknote },
              { id: "qris", label: "QRIS", icon: QrCode },
              { id: "transfer", label: "Transfer", icon: CreditCard },
            ] as { id: PaymentMethod; label: string; icon: React.ElementType }[]
          ).map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-all",
                  paymentMethod === m.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Cash Input & Quick Nominal Buttons */}
        {paymentMethod === "tunai" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-600">
                Uang Diterima
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-right text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setAmountPaidInput(String(totalAmount))}
                className="rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              >
                Uang Pas
              </button>
              <button
                type="button"
                onClick={() => setAmountPaidInput("50000")}
                className="rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              >
                50.000
              </button>
              <button
                type="button"
                onClick={() => setAmountPaidInput("100000")}
                className="rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 transition-colors"
              >
                100.000
              </button>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/80 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Diskon</span>
              <span>-{formatRupiah(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
            <span>Total</span>
            <span className="text-emerald-600">{formatRupiah(totalAmount)}</span>
          </div>
          {paymentMethod === "tunai" && (
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Kembalian</span>
              <span className="text-emerald-700">
                {formatRupiah(changeAmount)}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={
            isCheckingOut ||
            cart.length === 0 ||
            (paymentMethod === "tunai" && amountPaid < totalAmount)
          }
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all duration-200"
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses Pembayaran...
            </>
          ) : (
            <>Bayar & Cetak Struk</>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Kasir (Point of Sale)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pilih produk atau scan barcode untuk memproses transaksi cepat.
          </p>
        </div>

        {/* Mobile Cart Floating Trigger */}
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-[0.98]"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Keranjang ({totalItems})</span>
        </button>
      </div>

      {/* 2-Column Split POS Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Grid */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Barcode Bar */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari produk atau scan barcode SKU lalu tekan Enter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleBarcodeEnter}
              className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-sm text-slate-900 shadow-soft placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <Barcode className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Horizontal Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("semua")}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                selectedCategory === "semua"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Semua Produk
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
                  selectedCategory === cat.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredProducts.map((product) => {
              const status = getStockStatus(product);
              const isOut = product.stock === 0;
              const inCart = cart.find((i) => i.product.id === product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOut}
                  onClick={() => addToCart(product)}
                  className={cn(
                    "group relative text-left rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between min-h-[136px]",
                    isOut
                      ? "bg-slate-100/80 border-slate-200/80 opacity-60 cursor-not-allowed"
                      : "bg-white border-slate-200/80 shadow-soft hover:border-emerald-400 hover:shadow-card active:scale-[0.98]",
                    inCart && !isOut && "ring-2 ring-emerald-500/30 border-emerald-500"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-semibold text-slate-400">
                        {product.sku}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                          status === "aman" && "bg-emerald-50 text-emerald-700",
                          status === "menipis" && "bg-amber-50 text-amber-700",
                          status === "habis" && "bg-rose-100 text-rose-700"
                        )}
                      >
                        {isOut ? "Habis" : `${product.stock} ${product.unit}`}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-slate-900 mt-2 line-clamp-2 leading-snug">
                      {product.name}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-sm font-extrabold text-emerald-600">
                      {formatRupiah(product.sell_price)}
                    </span>
                    {inCart && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                        {inCart.qty}
                      </span>
                    )}
                    {isOut && <PackageX className="h-4 w-4 text-rose-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Desktop Interactive Cart */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6 rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden min-h-[540px] max-h-[calc(100vh-110px)] flex flex-col">
          {renderCartContent()}
        </div>
      </div>

      {/* Mobile Slide-Over Cart Drawer */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">
                Checkout Kasir
              </span>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{renderCartContent()}</div>
          </div>
        </div>
      )}

      {/* Printable / Shareable 58mm Thermal Digital Receipt */}
      <ReceiptModal
        transaction={receiptTrx}
        storeName={user?.store_name || "Toko Berkah Mandiri"}
        onClose={() => setReceiptTrx(null)}
      />
    </div>
  );
}

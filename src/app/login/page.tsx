"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Package,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useApp } from "@/lib/store-context";
import { formatRupiah } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginDemo, isDemoMode } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoPanel, setShowDemoPanel] = useState(isDemoMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email dan kata sandi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await loginWithEmail(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleQuickDemo = (role: "owner" | "cashier") => {
    loginDemo(role);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Left Panel: Dark Emerald-Slate Gradient Brand Showcase */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white">
        {/* Subtle geometric grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 shadow-lg shadow-emerald-950/50">
            <Store className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">
              KasirKu<span className="text-emerald-400">.id</span>
            </span>
            <p className="text-xs text-slate-400">
              Inventaris & Point of Sale UMKM
            </p>
          </div>
        </div>

        {/* Center Interactive Preview Card */}
        <div className="relative z-10 my-auto space-y-8 max-w-lg">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3.5 py-1.5 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Sistem Kasir & Stok Real-Time
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Kelola Stok & Kasir UMKM Lebih Cepat, Akurat, dan Tanpa Selisih.
            </h1>
            <p className="text-sm text-slate-300/90 leading-relaxed">
              Pantau omzet harian, estimasi laba bersih, peringatan stok menipis,
              hingga cetak struk digital 58mm dalam satu aplikasi modern.
            </p>
          </div>

          {/* Live Metrics Preview Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Ringkasan Toko Hari Ini
                </p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {formatRupiah(425500)}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" />
                +18.4%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div className="rounded-xl bg-slate-900/60 p-3 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Package className="h-3.5 w-3.5 text-emerald-400" />
                  Produk Aktif
                </div>
                <p className="text-base font-bold text-white mt-1">10 SKU</p>
              </div>
              <div className="rounded-xl bg-slate-900/60 p-3 border border-white/5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  Audit Stok
                </div>
                <p className="text-base font-bold text-white mt-1">
                  100% Akurat
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} KasirKu UMKM</span>
          <span>Dibangun dengan Next.js & Supabase</span>
        </div>
      </div>

      {/* Right Panel: Clean Glassmorphism Login Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              KasirKu<span className="text-emerald-600">.id</span>
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-7 sm:p-8 shadow-card space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Masuk ke Akun Anda
              </h2>
              <p className="text-sm text-slate-500">
                Masukkan email dan kata sandi untuk mengakses kasir & inventaris.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Alamat Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@tokoberkah.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    Masuk Sekarang
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Mode Helper Toggle */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Ingin langsung mencoba tanpa setup Supabase?
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoPanel((prev) => !prev)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {showDemoPanel ? "Sembunyikan" : "Mode Demo"}
                </button>
              </div>

              {showDemoPanel && (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Login Cepat (Mode Demo Lokal)
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleQuickDemo("owner")}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-white border border-emerald-200 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:border-emerald-400 hover:text-emerald-700 active:scale-[0.98] transition-all"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Masuk Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemo("cashier")}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:border-emerald-400 hover:text-emerald-700 active:scale-[0.98] transition-all"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-slate-600" />
                      Masuk Kasir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

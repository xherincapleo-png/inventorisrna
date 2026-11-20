import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Product, StockStatus } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  const sign = rounded < 0 ? "-" : "";
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}Rp ${formatted}`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function getStockStatus(product: Pick<Product, "stock" | "min_stock">): StockStatus {
  if (product.stock <= 0) return "habis";
  if (product.stock <= product.min_stock) return "menipis";
  return "aman";
}

export function calculateMarginPercent(costPrice: number, sellPrice: number): number {
  if (sellPrice <= 0) return 0;
  return Math.round(((sellPrice - costPrice) / sellPrice) * 1000) / 10;
}

export function generateSKU(categoryName = "PRD"): string {
  const prefix = categoryName
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randomNum}`;
}

export function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${y}${m}${d}-${rand}`;
}

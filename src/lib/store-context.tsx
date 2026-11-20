"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEMO_CATEGORIES,
  DEMO_MOVEMENTS,
  DEMO_PRODUCTS,
  DEMO_TRANSACTIONS,
} from "@/lib/demo-data";
import { generateInvoiceNumber } from "@/lib/utils";
import type {
  CartItem,
  Category,
  MovementType,
  PaymentMethod,
  Product,
  StockMovement,
  Transaction,
  TransactionItem,
  UserProfile,
  UserRole,
} from "@/types/database";

const STORAGE_KEY = "kasirku_demo_state_v1";

interface ProductInput {
  sku: string;
  name: string;
  category_id: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
}

interface CheckoutPayload {
  items: CartItem[];
  discount: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  notes?: string;
}

interface AppContextValue {
  isDemoMode: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  categories: Category[];
  products: Product[];
  transactions: Transaction[];
  movements: StockMovement[];
  loginWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  loginDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  addProduct: (input: ProductInput) => Promise<boolean>;
  updateProduct: (id: string, input: Partial<ProductInput>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  adjustStock: (
    productId: string,
    type: Extract<MovementType, "IN" | "ADJUSTMENT">,
    qtyChange: number,
    notes: string
  ) => Promise<boolean>;
  processCheckout: (payload: CheckoutPayload) => Promise<Transaction | null>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setDemoCookie(role: UserRole | null) {
  if (typeof document === "undefined") return;
  if (role) {
    document.cookie = `kasirku_demo_role=${role}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = `kasirku_demo_role=; path=/; max-age=0; SameSite=Lax`;
  }
}

function makeDemoProfile(role: UserRole): UserProfile {
  return role === "owner"
    ? {
        id: "demo-owner",
        full_name: "Budi Santoso",
        email: "owner@tokoberkah.id",
        role: "owner",
        store_name: "Toko Berkah Mandiri",
      }
    : {
        id: "demo-cashier",
        full_name: "Siti Aminah",
        email: "kasir@tokoberkah.id",
        role: "cashier",
        store_name: "Toko Berkah Mandiri",
      };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabaseReady = isSupabaseConfigured();
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!supabaseReady);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [transactions, setTransactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);
  const [movements, setMovements] = useState<StockMovement[]>(DEMO_MOVEMENTS);

  const persistDemoState = useCallback(
    (
      nextProducts: Product[],
      nextTransactions: Transaction[],
      nextMovements: StockMovement[]
    ) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            products: nextProducts,
            transactions: nextTransactions,
            movements: nextMovements,
          })
        );
      } catch {
        // Ignore storage quota errors
      }
    },
    []
  );

  const loadDemoState = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.products)) setProducts(parsed.products);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (Array.isArray(parsed.movements)) setMovements(parsed.movements);
      }
    } catch {
      // Fallback to defaults
    }
    setCategories(DEMO_CATEGORIES);
  }, []);

  const refreshSupabaseData = useCallback(async () => {
    const supabase = createClient();
    const [catRes, prodRes, trxRes, movRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("products")
        .select("*, categories(name)")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

    if (catRes.data) setCategories(catRes.data as Category[]);
    if (prodRes.data) {
      const mapped = prodRes.data.map((row: Record<string, unknown>) => ({
        ...(row as unknown as Product),
        category_name:
          (row.categories as { name?: string } | null)?.name || "Lainnya",
      }));
      setProducts(mapped);
    }
    if (trxRes.data) setTransactions(trxRes.data as Transaction[]);
    if (movRes.data) setMovements(movRes.data as StockMovement[]);
  }, []);

  const refreshData = useCallback(async () => {
    if (isDemoMode) {
      loadDemoState();
    } else {
      await refreshSupabaseData();
    }
  }, [isDemoMode, loadDemoState, refreshSupabaseData]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      const demoCookie = getCookie("kasirku_demo_role") as UserRole | null;

      if (supabaseReady && !demoCookie) {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser && mounted) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();

          setIsDemoMode(false);
          setUser(
            profile
              ? (profile as UserProfile)
              : {
                  id: authUser.id,
                  full_name: authUser.email?.split("@")[0] || "Pengguna",
                  email: authUser.email || "",
                  role: "cashier",
                  store_name: "Toko Berkah Mandiri",
                }
          );
          await refreshSupabaseData();
          if (mounted) setIsLoading(false);
          return;
        }
      }

      if (mounted) {
        if (demoCookie === "owner" || demoCookie === "cashier") {
          setIsDemoMode(true);
          setUser(makeDemoProfile(demoCookie));
          loadDemoState();
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [supabaseReady, loadDemoState, refreshSupabaseData]);

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    if (!supabaseReady) {
      return {
        error:
          "Supabase belum dikonfigurasi (.env.local). Gunakan tombol Mode Demo di bawah untuk langsung mencoba aplikasi.",
      };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      setDemoCookie(null);
      setIsDemoMode(false);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      setUser(
        profile
          ? (profile as UserProfile)
          : {
              id: data.user.id,
              full_name: data.user.email?.split("@")[0] || "Pengguna",
              email: data.user.email || "",
              role: "cashier",
              store_name: "Toko Berkah Mandiri",
            }
      );
      await refreshSupabaseData();
    }

    return {};
  };

  const loginDemo = (role: UserRole) => {
    setDemoCookie(role);
    setIsDemoMode(true);
    setUser(makeDemoProfile(role));
    loadDemoState();
    toast.success(
      `Berhasil masuk sebagai ${role === "owner" ? "Owner" : "Kasir"} (Mode Demo)`
    );
  };

  const logout = async () => {
    setDemoCookie(null);
    if (supabaseReady && !isDemoMode) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    toast.success("Anda telah keluar dari sesi.");
  };

  const addProduct = async (input: ProductInput): Promise<boolean> => {
    if (user?.role !== "owner") {
      toast.error("Hanya Owner yang dapat menambahkan produk baru.");
      return false;
    }

    const category = categories.find((c) => c.id === input.category_id);

    if (isDemoMode) {
      const exists = products.some(
        (p) => p.sku.toLowerCase() === input.sku.toLowerCase()
      );
      if (exists) {
        toast.error("SKU sudah digunakan oleh produk lain.");
        return false;
      }

      const nowIso = new Date().toISOString();
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        sku: input.sku,
        name: input.name,
        category_id: input.category_id,
        category_name: category?.name || "Lainnya",
        unit: input.unit,
        cost_price: input.cost_price,
        sell_price: input.sell_price,
        stock: input.stock,
        min_stock: input.min_stock,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      };

      const nextProducts = [newProduct, ...products];
      let nextMovements = movements;
      if (input.stock > 0) {
        nextMovements = [
          {
            id: `mov-${Date.now()}`,
            product_id: newProduct.id,
            product_name: newProduct.name,
            type: "IN",
            qty_change: input.stock,
            remaining_stock: input.stock,
            staff_id: user.id,
            staff_name: user.full_name,
            notes: "Stok awal produk baru",
            created_at: nowIso,
          },
          ...movements,
        ];
      }

      setProducts(nextProducts);
      setMovements(nextMovements);
      persistDemoState(nextProducts, transactions, nextMovements);
      toast.success(`Produk "${input.name}" berhasil ditambahkan.`);
      return true;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        sku: input.sku,
        name: input.name,
        category_id: input.category_id,
        unit: input.unit,
        cost_price: input.cost_price,
        sell_price: input.sell_price,
        stock: input.stock,
        min_stock: input.min_stock,
      })
      .select()
      .single();

    if (error) {
      toast.error(`Gagal menambah produk: ${error.message}`);
      return false;
    }

    if (data && input.stock > 0) {
      await supabase.from("stock_movements").insert({
        product_id: data.id,
        product_name: data.name,
        type: "IN",
        qty_change: input.stock,
        remaining_stock: input.stock,
        staff_id: user.id,
        staff_name: user.full_name,
        notes: "Stok awal produk baru",
      });
    }

    await refreshSupabaseData();
    toast.success(`Produk "${input.name}" berhasil ditambahkan.`);
    return true;
  };

  const updateProduct = async (
    id: string,
    input: Partial<ProductInput>
  ): Promise<boolean> => {
    if (user?.role !== "owner") {
      toast.error("Hanya Owner yang dapat mengubah data produk.");
      return false;
    }

    if (isDemoMode) {
      const nextProducts = products.map((p) => {
        if (p.id !== id) return p;
        const cat = input.category_id
          ? categories.find((c) => c.id === input.category_id)
          : undefined;
        return {
          ...p,
          ...input,
          category_name: cat ? cat.name : p.category_name,
          updated_at: new Date().toISOString(),
        };
      });
      setProducts(nextProducts);
      persistDemoState(nextProducts, transactions, movements);
      toast.success("Perubahan produk berhasil disimpan.");
      return true;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(`Gagal memperbarui produk: ${error.message}`);
      return false;
    }

    await refreshSupabaseData();
    toast.success("Perubahan produk berhasil disimpan.");
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (user?.role !== "owner") {
      toast.error("Hanya Owner yang dapat menghapus produk.");
      return false;
    }

    if (isDemoMode) {
      const nextProducts = products.filter((p) => p.id !== id);
      setProducts(nextProducts);
      persistDemoState(nextProducts, transactions, movements);
      toast.success("Produk berhasil dihapus.");
      return true;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error(`Gagal menghapus produk: ${error.message}`);
      return false;
    }

    await refreshSupabaseData();
    toast.success("Produk berhasil dihapus.");
    return true;
  };

  const adjustStock = async (
    productId: string,
    type: Extract<MovementType, "IN" | "ADJUSTMENT">,
    qtyChange: number,
    notes: string
  ): Promise<boolean> => {
    const product = products.find((p) => p.id === productId);
    if (!product) return false;

    const delta = type === "IN" ? Math.abs(qtyChange) : qtyChange;
    const nextStock = product.stock + delta;

    if (nextStock < 0) {
      toast.error("Stok akhir tidak boleh kurang dari 0.");
      return false;
    }

    const nowIso = new Date().toISOString();

    if (isDemoMode) {
      const nextProducts = products.map((p) =>
        p.id === productId
          ? { ...p, stock: nextStock, updated_at: nowIso }
          : p
      );
      const newMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        type,
        qty_change: delta,
        remaining_stock: nextStock,
        staff_id: user?.id,
        staff_name: user?.full_name || "Staf",
        notes: notes.trim(),
        created_at: nowIso,
      };
      const nextMovements = [newMovement, ...movements];
      setProducts(nextProducts);
      setMovements(nextMovements);
      persistDemoState(nextProducts, transactions, nextMovements);
      toast.success(
        `Stok "${product.name}" diperbarui (${delta > 0 ? `+${delta}` : delta} ${product.unit}).`
      );
      return true;
    }

    const supabase = createClient();
    const { error: updateErr } = await supabase
      .from("products")
      .update({ stock: nextStock, updated_at: nowIso })
      .eq("id", productId);

    if (updateErr) {
      toast.error(`Gagal memperbarui stok: ${updateErr.message}`);
      return false;
    }

    const { error: movErr } = await supabase.from("stock_movements").insert({
      product_id: product.id,
      product_name: product.name,
      type,
      qty_change: delta,
      remaining_stock: nextStock,
      staff_id: user?.id,
      staff_name: user?.full_name || "Staf",
      notes: notes.trim(),
    });

    if (movErr) {
      toast.error(`Stok diperbarui, namun gagal mencatat log: ${movErr.message}`);
    }

    await refreshSupabaseData();
    toast.success(
      `Stok "${product.name}" diperbarui (${delta > 0 ? `+${delta}` : delta} ${product.unit}).`
    );
    return true;
  };

  const processCheckout = async (
    payload: CheckoutPayload
  ): Promise<Transaction | null> => {
    if (payload.items.length === 0) {
      toast.error("Keranjang belanja masih kosong.");
      return null;
    }

    const subtotal = payload.items.reduce(
      (sum, item) => sum + item.product.sell_price * item.qty,
      0
    );
    const totalCost = payload.items.reduce(
      (sum, item) => sum + item.product.cost_price * item.qty,
      0
    );
    const discount = Math.max(0, Math.min(payload.discount, subtotal));
    const totalAmount = Math.max(0, subtotal - discount);
    const amountPaid =
      payload.payment_method === "tunai" ? payload.amount_paid : totalAmount;

    if (payload.payment_method === "tunai" && amountPaid < totalAmount) {
      toast.error("Nominal uang tunai kurang dari total tagihan.");
      return null;
    }

    const changeAmount = Math.max(0, amountPaid - totalAmount);

    if (isDemoMode) {
      // Validate stock
      for (const item of payload.items) {
        const current = products.find((p) => p.id === item.product.id);
        if (!current || current.stock < item.qty) {
          toast.error(
            `Stok "${item.product.name}" tidak mencukupi (tersisa ${current?.stock ?? 0}).`
          );
          return null;
        }
      }

      const nowIso = new Date().toISOString();
      const invoiceNumber = generateInvoiceNumber();
      const trxId = `trx-${Date.now()}`;

      const trxItems: TransactionItem[] = payload.items.map((item, idx) => ({
        id: `trxi-${Date.now()}-${idx}`,
        transaction_id: trxId,
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        qty: item.qty,
        unit_price: item.product.sell_price,
        cost_price: item.product.cost_price,
        subtotal: item.product.sell_price * item.qty,
      }));

      const newTrx: Transaction = {
        id: trxId,
        invoice_number: invoiceNumber,
        cashier_id: user?.id || "demo-cashier",
        cashier_name: user?.full_name || "Kasir",
        subtotal,
        discount,
        total_amount: totalAmount,
        total_cost: totalCost,
        total_profit: totalAmount - totalCost,
        payment_method: payload.payment_method,
        amount_paid: amountPaid,
        change_amount: changeAmount,
        notes: payload.notes,
        created_at: nowIso,
        items: trxItems,
      };

      const qtyMap = new Map(payload.items.map((i) => [i.product.id, i.qty]));
      const nextProducts = products.map((p) => {
        const deduct = qtyMap.get(p.id);
        if (!deduct) return p;
        return { ...p, stock: p.stock - deduct, updated_at: nowIso };
      });

      const newMovements: StockMovement[] = payload.items.map((item, idx) => {
        const updatedProd = nextProducts.find((p) => p.id === item.product.id);
        return {
          id: `mov-${Date.now()}-${idx}`,
          product_id: item.product.id,
          product_name: item.product.name,
          type: "OUT",
          qty_change: -item.qty,
          remaining_stock: updatedProd?.stock ?? 0,
          reference_id: trxId,
          staff_id: user?.id,
          staff_name: user?.full_name || "Kasir",
          notes: `Penjualan Kasir #${invoiceNumber}`,
          created_at: nowIso,
        };
      });

      const nextTransactions = [newTrx, ...transactions];
      const nextMovements = [...newMovements, ...movements];

      setProducts(nextProducts);
      setTransactions(nextTransactions);
      setMovements(nextMovements);
      persistDemoState(nextProducts, nextTransactions, nextMovements);
      toast.success(`Transaksi ${invoiceNumber} berhasil disimpan!`);
      return newTrx;
    }

    // Live Supabase Atomic RPC Checkout
    const supabase = createClient();
    const rpcItems = payload.items.map((i) => ({
      product_id: i.product.id,
      qty: i.qty,
    }));

    const { data, error } = await supabase.rpc("process_pos_checkout", {
      p_items: rpcItems,
      p_discount: discount,
      p_payment_method: payload.payment_method,
      p_amount_paid: amountPaid,
      p_notes: payload.notes || null,
    });

    if (error) {
      toast.error(`Checkout gagal: ${error.message}`);
      return null;
    }

    await refreshSupabaseData();
    toast.success(`Transaksi ${data.invoice_number} berhasil disimpan!`);

    const receiptTrx: Transaction = {
      id: data.transaction_id,
      invoice_number: data.invoice_number,
      cashier_id: user?.id || "",
      cashier_name: user?.full_name || "Kasir",
      subtotal: data.subtotal,
      discount: data.discount,
      total_amount: data.total_amount,
      total_cost: totalCost,
      total_profit: data.total_amount - totalCost,
      payment_method: data.payment_method,
      amount_paid: data.amount_paid,
      change_amount: data.change_amount,
      created_at: data.created_at,
      items: payload.items.map((item, idx) => ({
        id: `item-${idx}`,
        transaction_id: data.transaction_id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        qty: item.qty,
        unit_price: item.product.sell_price,
        cost_price: item.product.cost_price,
        subtotal: item.product.sell_price * item.qty,
      })),
    };

    return receiptTrx;
  };

  return (
    <AppContext.Provider
      value={{
        isDemoMode,
        isLoading,
        user,
        categories,
        products,
        transactions,
        movements,
        loginWithEmail,
        loginDemo,
        logout,
        refreshData,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        processCheckout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp harus digunakan di dalam AppProvider");
  }
  return ctx;
}

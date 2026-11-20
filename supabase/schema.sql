-- ============================================================================
-- UMKM Inventory & Point of Sale (POS) - Supabase PostgreSQL Schema
-- ============================================================================
-- Jalankan script ini di Supabase SQL Editor untuk membuat seluruh tabel,
-- RLS policies (Owner vs Cashier), fungsi RPC atomic checkout, dan data awal.
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'cashier');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('tunai', 'qris', 'transfer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tables

-- 3.1 Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cashier',
  store_name TEXT NOT NULL DEFAULT 'Toko Berkah Mandiri',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'emerald',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'pcs', -- pcs, pack, kg, dus, botol, liter
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sell_price NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cashier_name TEXT NOT NULL DEFAULT 'Kasir',
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(14, 2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'tunai',
  amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Transaction Items
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(14, 2) NOT NULL,
  cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 Stock Movements (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type movement_type NOT NULL,
  qty_change INTEGER NOT NULL,
  remaining_stock INTEGER NOT NULL,
  reference_id UUID, -- optional transaction_id
  staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL DEFAULT 'Sistem',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);

-- 4. Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Trigger: Auto-create profile on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'cashier')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile or owner views all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_my_role() = 'owner');

CREATE POLICY "Owner can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'owner');

-- Categories policies
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can manage categories"
  ON public.categories FOR ALL
  USING (public.get_my_role() = 'owner')
  WITH CHECK (public.get_my_role() = 'owner');

-- Products policies
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only owner can insert or delete products"
  ON public.products FOR INSERT
  WITH CHECK (public.get_my_role() = 'owner');

CREATE POLICY "Only owner can delete products"
  ON public.products FOR DELETE
  USING (public.get_my_role() = 'owner');

CREATE POLICY "Owner can update products, cashier can update stock via restock"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Transactions policies
CREATE POLICY "Owner sees all transactions, cashier sees own"
  ON public.transactions FOR SELECT
  USING (public.get_my_role() = 'owner' OR cashier_id = auth.uid());

CREATE POLICY "Authenticated users can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Transaction Items policies
CREATE POLICY "Authenticated users can view transaction items"
  ON public.transaction_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert transaction items"
  ON public.transaction_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Stock Movements policies (Immutable: SELECT & INSERT only)
CREATE POLICY "Authenticated users can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can log stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Atomic POS Checkout RPC Function
-- Validates stock availability, creates transaction + items, decrements stock,
-- and logs OUT stock_movements in a single atomic database transaction.
CREATE OR REPLACE FUNCTION public.process_pos_checkout(
  p_items JSONB, -- Array of { "product_id": uuid, "qty": integer }
  p_discount NUMERIC DEFAULT 0,
  p_payment_method payment_method DEFAULT 'tunai',
  p_amount_paid NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_staff_name TEXT;
  v_invoice_number TEXT;
  v_transaction_id UUID;
  v_subtotal NUMERIC(14, 2) := 0;
  v_total_cost NUMERIC(14, 2) := 0;
  v_total_amount NUMERIC(14, 2) := 0;
  v_total_profit NUMERIC(14, 2) := 0;
  v_change_amount NUMERIC(14, 2) := 0;
  v_item JSONB;
  v_product RECORD;
  v_qty INTEGER;
  v_item_subtotal NUMERIC(14, 2);
  v_new_stock INTEGER;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang belanja tidak boleh kosong.';
  END IF;

  SELECT COALESCE(full_name, 'Kasir') INTO v_staff_name
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_staff_name IS NULL THEN
    v_staff_name := 'Kasir';
  END IF;

  -- Generate invoice number: INV-YYYYMMDD-XXXX
  v_invoice_number := 'INV-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::TEXT, 4, '0');

  -- First pass: lock rows & validate stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'qty')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah qty produk tidak valid.';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan.', v_item->>'product_id';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Stok "%" tidak mencukupi (tersisa % %).', v_product.name, v_product.stock, v_product.unit;
    END IF;

    v_subtotal := v_subtotal + (v_product.sell_price * v_qty);
    v_total_cost := v_total_cost + (v_product.cost_price * v_qty);
  END LOOP;

  v_total_amount := GREATEST(0, v_subtotal - COALESCE(p_discount, 0));
  v_total_profit := v_total_amount - v_total_cost;

  IF p_payment_method = 'tunai' AND p_amount_paid < v_total_amount THEN
    RAISE EXCEPTION 'Nominal pembayaran tunai kurang dari total tagihan.';
  END IF;

  v_change_amount := GREATEST(0, COALESCE(p_amount_paid, v_total_amount) - v_total_amount);

  -- Insert transaction header
  INSERT INTO public.transactions (
    invoice_number,
    cashier_id,
    cashier_name,
    subtotal,
    discount,
    total_amount,
    total_cost,
    total_profit,
    payment_method,
    amount_paid,
    change_amount,
    notes
  ) VALUES (
    v_invoice_number,
    v_user_id,
    v_staff_name,
    v_subtotal,
    COALESCE(p_discount, 0),
    v_total_amount,
    v_total_cost,
    v_total_profit,
    p_payment_method,
    COALESCE(p_amount_paid, v_total_amount),
    v_change_amount,
    p_notes
  )
  RETURNING id INTO v_transaction_id;

  -- Second pass: insert items, deduct stock, log movement
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'qty')::INTEGER;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID;

    v_item_subtotal := v_product.sell_price * v_qty;
    v_new_stock := v_product.stock - v_qty;

    INSERT INTO public.transaction_items (
      transaction_id,
      product_id,
      product_name,
      product_sku,
      qty,
      unit_price,
      cost_price,
      subtotal
    ) VALUES (
      v_transaction_id,
      v_product.id,
      v_product.name,
      v_product.sku,
      v_qty,
      v_product.sell_price,
      v_product.cost_price,
      v_item_subtotal
    );

    UPDATE public.products
    SET stock = v_new_stock, updated_at = NOW()
    WHERE id = v_product.id;

    INSERT INTO public.stock_movements (
      product_id,
      product_name,
      type,
      qty_change,
      remaining_stock,
      reference_id,
      staff_id,
      staff_name,
      notes
    ) VALUES (
      v_product.id,
      v_product.name,
      'OUT',
      -v_qty,
      v_new_stock,
      v_transaction_id,
      v_user_id,
      v_staff_name,
      'Penjualan Kasir #' || v_invoice_number
    );
  END LOOP;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'invoice_number', v_invoice_number,
    'subtotal', v_subtotal,
    'discount', COALESCE(p_discount, 0),
    'total_amount', v_total_amount,
    'amount_paid', COALESCE(p_amount_paid, v_total_amount),
    'change_amount', v_change_amount,
    'payment_method', p_payment_method,
    'created_at', NOW()
  );
END;
$$;

-- 7. Seed Data: Categories & 10 Realistic Indonesian UMKM Products
INSERT INTO public.categories (name, color) VALUES
  ('Sembako', 'emerald'),
  ('Minuman', 'sky'),
  ('Frozen Food', 'indigo'),
  ('Makanan Ringan', 'amber')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (sku, name, category_id, unit, cost_price, sell_price, stock, min_stock)
SELECT
  v.sku,
  v.name,
  c.id,
  v.unit,
  v.cost_price,
  v.sell_price,
  v.stock,
  v.min_stock
FROM (
  VALUES
    ('SMB-001', 'Beras Pandan Wangi 5kg', 'Sembako', 'pack', 68000, 78000, 24, 8),
    ('SMB-002', 'Minyak Goreng Bimoli 2L', 'Sembako', 'pack', 33500, 38000, 6, 10),
    ('SMB-003', 'Gula Pasir Gulaku 1kg', 'Sembako', 'pack', 15500, 18000, 32, 10),
    ('SMB-004', 'Telur Ayam Negeri', 'Sembako', 'kg', 25000, 29000, 4, 8),
    ('SMB-005', 'Indomie Goreng Original (1 Dus)', 'Sembako', 'dus', 108000, 120000, 15, 5),
    ('MNM-001', 'Teh Pucuk Harum 350ml', 'Minuman', 'pcs', 2800, 4000, 48, 15),
    ('MNM-002', 'Aqua Air Mineral 600ml', 'Minuman', 'pcs', 2500, 3500, 60, 20),
    ('MNM-003', 'Kopi Kapal Api Special 165g', 'Minuman', 'pack', 13500, 16500, 5, 8),
    ('FRZ-001', 'Fiesta Chicken Nugget 500g', 'Frozen Food', 'pack', 42000, 49500, 12, 6),
    ('FRZ-002', 'Kanzler Sosis Singles Original', 'Frozen Food', 'pcs', 6800, 8500, 0, 10)
) AS v(sku, name, cat_name, unit, cost_price, sell_price, stock, min_stock)
JOIN public.categories c ON c.name = v.cat_name
ON CONFLICT (sku) DO NOTHING;

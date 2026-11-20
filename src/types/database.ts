export type UserRole = "owner" | "cashier";

export type PaymentMethod = "tunai" | "qris" | "transfer";

export type MovementType = "IN" | "OUT" | "ADJUSTMENT";

export type StockStatus = "aman" | "menipis" | "habis";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  store_name: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  category_name?: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  qty: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  cashier_id: string;
  cashier_name: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  total_cost: number;
  total_profit: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  change_amount: number;
  notes?: string;
  created_at: string;
  items?: TransactionItem[];
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: MovementType;
  qty_change: number;
  remaining_stock: number;
  reference_id?: string;
  staff_id?: string;
  staff_name: string;
  notes: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface DailyChartPoint {
  date: string;
  label: string;
  omzet: number;
  laba: number;
  transaksi: number;
}

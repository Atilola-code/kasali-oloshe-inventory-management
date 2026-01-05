// src/app/types/index.ts
export interface Deposit {
  id: number;
  amount: number;
  depositor_name: string;
  bank_name: string;
  date: string;
  created_by?: string;
  created_at?: string;
}

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  selling_price: number;
  cost_price?: number;
  date_added?: string; // Make optional for backward compatibility
  low_stock_threshold?: number;
};

export type Sale = {
  id: number;
  invoice_id: string;
  customer_name?: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  total_amount: number;
  date: string;
  payment_method: string;
  items: SaleItem[];
  amount_paid: number;
  change_due: number;
  cashier_name: string;
  receipt_print_count: number;
};

export type SaleItem = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
  phone?: string;
};

export type Credit = {
  id: number;
  invoice_id: string;
  customer_name: string;
  total_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  status: 'pending' | 'partially_paid' | 'cleared';
  date: string;
  payments?: CreditPayment[];
  created_by?: string;
};

export type CreditPayment = {
  id: number;
  credit_id: number;
  amount_paid: number;
  customer_name: string;
  payment_method: 'cash' | 'transfer' | 'pos' | 'bank';
  remarks?: string;
  date: string;
  recorded_by?: string;
  recorded_by_name: string;
};


export interface PurchaseOrderItem {
  id?: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  stock_value?: number;
}

export interface PurchaseOrderHistory {
  id: number;
  action: string;
  old_status?: string;
  new_status?: string;
  performed_by_name: string;
  notes: string;
  timestamp: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_delivery: string;
  status: 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';
  total_amount: number;
  stock_value: number;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  received_by?: number;
  received_by_name?: string;
  approved_at?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
  history?: PurchaseOrderHistory[];
}

export interface POStatistics {
  total_purchase_orders: number;
  draft: number;
  pending: number;
  approved: number;
  received: number;
  total_value: number;
  pending_value: number;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export type DashboardView = 'products' | 'sales' | 'receipt';
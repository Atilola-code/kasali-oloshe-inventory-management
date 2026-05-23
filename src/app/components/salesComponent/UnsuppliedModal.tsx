// src/app/components/salesComponent/UnsuppliedModal.tsx
"use client";
import { useState } from "react";
import { X, User, Package, Plus, Trash2, AlertCircle } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";
import { Product } from "@/app/types";

interface UnsuppliedModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onUnsuppliedCreated: () => void;
}

interface ItemRow {
  product_id: string;
  quantity: number;
  notes: string;
}

export default function UnsuppliedModal({
  open,
  onClose,
  products,
  onUnsuppliedCreated,
}: UnsuppliedModalProps) {
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [globalNotes, setGlobalNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    { product_id: "", quantity: 1, notes: "" },
  ]);

  const today = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function addItem() {
    setItems((prev) => [...prev, { product_id: "", quantity: 1, notes: "" }]);
  }

  function removeItem(idx: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function resetForm() {
    setCustomerName("");
    setGlobalNotes("");
    setItems([{ product_id: "", quantity: 1, notes: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim()) {
      showError("Please enter the customer's name");
      return;
    }

    const validItems = items.filter((it) => it.product_id && it.quantity > 0);
    if (validItems.length === 0) {
      showError("Please add at least one product");
      return;
    }

    const hasEmpty = items.some((it) => !it.product_id);
    if (hasEmpty) {
      showError("Please select a product for every row, or remove empty rows");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        notes: globalNotes.trim() || null,
        items: items.map((it) => ({
          product: parseInt(it.product_id),
          quantity: Number(it.quantity),
          notes: it.notes.trim() || null,
        })),
      };

      const res = await apiFetch("/api/sales/unsupplied/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        showError(err.detail || err.error || "Failed to create unsupplied record");
        return;
      }

      showSuccess("Unsupplied record created successfully!");
      resetForm();
      onUnsuppliedCreated();
      onClose();
    } catch (err: any) {
      showError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Record Unsupplied Goods</h2>
              <p className="text-sm text-gray-500">Track goods pending delivery to customer</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Customer + Date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500">
                {today}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              placeholder="Any additional notes about this unsupplied order..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none resize-none text-sm"
            />
          </div>

          {/* Products */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Products <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="space-y-3">
              {/* Column labels */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                <div className="col-span-5">Product</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-4">Item Note</div>
                <div className="col-span-1" />
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  {/* Product select */}
                  <div className="col-span-5">
                    <div className="relative">
                      <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(idx, "product_id", e.target.value)}
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none text-sm bg-white"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, "quantity", parseInt(e.target.value) || 1)
                      }
                      className="w-full px-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none text-sm text-center"
                    />
                  </div>

                  {/* Item note */}
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItem(idx, "notes", e.target.value)}
                      placeholder="Optional note"
                      className="w-full px-2 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 focus:outline-none text-sm"
                    />
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t flex-shrink-0">
          <button
            type="button"
            onClick={() => { resetForm(); onClose(); }}
            disabled={loading}
            className="px-5 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" />
                Saving...
              </>
            ) : (
              "Record Unsupplied"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
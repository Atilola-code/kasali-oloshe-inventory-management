// FILE 1: EditPOModal.tsx
// Path: src/app/components/purchaseOrders/EditPOModal.tsx

"use client";
import { useState, useEffect } from "react";
import { X, Package, Plus, Trash2 } from "lucide-react";
import { PurchaseOrder, Product } from "@/app/types";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";

interface EditPOModalProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
  products: Product[];
  onPOUpdated: () => void;
}

export default function EditPOModal({ open, onClose, po, products, onPOUpdated }: EditPOModalProps) {
  const [formData, setFormData] = useState({
    supplier_name: po.supplier_name,
    expected_delivery: po.expected_delivery.split('T')[0],
    notes: po.notes || "",
    items: po.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  });
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: 0, quantity: 1, unit_price: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length === 1) {
      showError("Must have at least one item");
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      showError("Please add at least one item");
      return;
    }

    // Validate all items have products selected
    const invalidItems = formData.items.filter(item => !item.product_id || item.product_id === 0);
    if (invalidItems.length > 0) {
      showError("Please select a product for all items");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/purchase-orders/${po.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSuccess("Purchase order updated successfully!");
        onPOUpdated();
        onClose();
      } else {
        const error = await response.json();
        showError(error.detail || "Failed to update PO");
      }
    } catch (error) {
      console.error("Error updating PO:", error);
      showError("Error updating purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Edit Purchase Order</h2>
              <p className="text-sm text-gray-600">{po.po_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Supplier Name *</label>
                <input
                  type="text"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Expected Delivery *</label>
                <input
                  type="date"
                  value={formData.expected_delivery}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                  className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-7 gap-2 items-center bg-gray-50 p-3 rounded-lg">
                    {/* Product Selection */}
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', parseInt(e.target.value))}
                      className="col-span-3 border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value={0}>Select product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} (Stock: {p.quantity})
                        </option>
                      ))}
                    </select>

                    {/* Quantity */}
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      className="col-span-1 border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={1}
                      required
                    />

                    {/* Unit Price */}
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                      className="col-span-2 border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min={0}
                      required
                    />

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      disabled={formData.items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Add any additional notes or instructions..."
              />
            </div>

            {/* Calculated Totals */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-medium">{formData.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quantity:</span>
                  <span className="font-medium">
                    {formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold text-blue-900 pt-2 border-t border-blue-200">
                  <span>Estimated Total:</span>
                  <span>
                    ₦{formData.items.reduce((sum, item) => 
                      sum + ((item.quantity || 0) * (item.unit_price || 0)), 0
                    ).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={(e: any) => handleSubmit(e)}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Updating..." : "Update Purchase Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
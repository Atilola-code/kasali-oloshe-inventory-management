
"use client";
import { useState } from "react";
import { X, DollarSign } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";

interface Expense {
  id: number;
  name: string;
  category: string;
  category_display: string;
  amount: number;
  description?: string;
  reference_number?: string;
  recipient?: string;
  payment_method: string;
  date: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface EditExpenseModalProps {
  open: boolean;
  onClose: () => void;
  expense: Expense;
  onExpenseUpdated: () => void;
}

export default function EditExpenseModal({ open, onClose, expense, onExpenseUpdated }: EditExpenseModalProps) {
  const [formData, setFormData] = useState({
    name: expense.name,
    category: expense.category,
    amount: expense.amount.toString(),
    description: expense.description || "",
    recipient: expense.recipient || "",
    payment_method: expense.payment_method,
    reference_number: expense.reference_number || "",
    date: expense.date.split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiFetch(`/api/expenses/${expense.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        showSuccess("Expense updated successfully!");
        onExpenseUpdated();
      } else {
        const error = await response.json();
        showError(error.detail || "Failed to update expense");
      }
    } catch (error) {
      showError("Error updating expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold">Edit Expense</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Expense Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border p-2 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border p-2 rounded-lg"
              >
                <option value="salary">Salary Payment</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="supplies">Office Supplies</option>
                <option value="maintenance">Maintenance</option>
                <option value="transport">Transport</option>
                <option value="marketing">Marketing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amount (₦) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full border p-2 rounded-lg"
                required
                min="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Recipient</label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                className="w-full border p-2 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Payment Method *</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full border p-2 rounded-lg"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border p-2 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reference Number</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full border p-2 rounded-lg"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border p-2 rounded-lg"
                rows={3}
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-xl hover:bg-gray-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={(e: any) => handleSubmit(e)}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
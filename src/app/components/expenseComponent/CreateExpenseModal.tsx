// ============================================================================
// CreateExpenseModal.tsx
// Path: src/app/components/expenseComponent/CreateExpenseModal.tsx
// ============================================================================

"use client";
import { useState } from "react";
import { X, DollarSign } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";

interface CreateExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onExpenseCreated: () => void;
}

export default function CreateExpenseModal({ open, onClose, onExpenseCreated }: CreateExpenseModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "salary",
    amount: "",
    description: "",
    recipient: "",
    payment_method: "bank",
    reference_number: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiFetch('/api/expenses/', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        showSuccess("Expense created successfully!");
        onExpenseCreated();
        // Reset form
        setFormData({
          name: "",
          category: "salary",
          amount: "",
          description: "",
          recipient: "",
          payment_method: "bank",
          reference_number: "",
          date: new Date().toISOString().split('T')[0]
        });
        onClose();
      } else {
        const error = await response.json();
        showError(error.detail || "Failed to create expense");
      }
    } catch (error) {
      showError("Error creating expense");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Create New Expense</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Expense Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Expense Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="e.g., January Salary - John Doe"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                min="0.01"
                placeholder="0.00"
              />
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium mb-2">Recipient</label>
              <input
                type="text"
                value={formData.recipient}
                onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Who received the payment"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium mb-2">Reference Number</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Transaction reference"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Additional details about this expense..."
              />
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
            {submitting ? "Creating..." : "Create Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
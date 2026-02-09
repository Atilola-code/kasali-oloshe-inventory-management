
"use client";
import { X, DollarSign, Calendar, User, FileText, CreditCard, Hash } from "lucide-react";

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

interface ViewExpenseModalProps {
  open: boolean;
  onClose: () => void;
  expense: Expense;
}

export default function ViewExpenseModal({ open, onClose, expense }: ViewExpenseModalProps) {
  if (!open) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodBadge = (method: string) => {
    const styles = {
      cash: 'bg-green-100 text-green-800',
      bank: 'bg-blue-100 text-blue-800',
      cheque: 'bg-purple-100 text-purple-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[method as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </span>
    );
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      salary: 'bg-blue-100 text-blue-800',
      rent: 'bg-purple-100 text-purple-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      supplies: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800',
      transport: 'bg-indigo-100 text-indigo-800',
      marketing: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Expense Details</h2>
              <p className="text-sm text-gray-600">ID: #{expense.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Expense Name</label>
                  <p className="font-medium text-gray-900">{expense.name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Category</label>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(expense.category)}`}>
                    {expense.category_display}
                  </span>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Amount</label>
                  <p className="font-bold text-2xl text-gray-900">₦{formatCurrency(expense.amount)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Payment Method</label>
                  {getPaymentMethodBadge(expense.payment_method)}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {expense.recipient && (
                  <div>
                    <label className="text-sm text-gray-600  mb-1 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Recipient
                    </label>
                    <p className="font-medium text-gray-900">{expense.recipient}</p>
                  </div>
                )}
                {expense.reference_number && (
                  <div>
                    <label className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Reference Number
                    </label>
                    <p className="font-medium text-gray-900">{expense.reference_number}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-600  mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </label>
                  <p className="font-medium text-gray-900">
                    {new Date(expense.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {expense.description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </label>
                <p className="text-gray-700">{expense.description}</p>
              </div>
            )}

            {/* Audit Trail */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Audit Trail</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Created By</label>
                  <p className="font-medium text-gray-900">{expense.created_by_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{formatDateTime(expense.created_at)}</p>
                </div>
                {expense.updated_by_name && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Last Updated By</label>
                    <p className="font-medium text-gray-900">{expense.updated_by_name}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(expense.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
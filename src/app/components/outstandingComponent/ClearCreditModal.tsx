"use client";
import { useState, useEffect, useRef } from "react";
import { X, DollarSign, User, CreditCard, MessageSquare, Banknote } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { Credit } from "@/app/types";
import { apiFetch } from "@/services/api";


interface ClearCreditModalProps {
  open: boolean;
  onClose: () => void;
  credit: Credit;
  onCreditCleared: () => void;
}

export default function ClearCreditModal({ open, onClose, credit, onCreditCleared }: ClearCreditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount_paid: credit.outstanding_amount.toString(),
    customer_name: credit.customer_name,
    payment_method: "cash",
    remarks: ""
  });
  
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Helper function to format currency
  const formatCurrency = (amount: number | string | undefined) => {
    let numAmount = 0;
    
    if (typeof amount === 'number') {
      numAmount = amount;
    } else if (typeof amount === 'string') {
      numAmount = parseFloat(amount) || 0;
    }
    
    if (isNaN(numAmount)) {
      numAmount = 0;
    }
    
    // Format with commas and 0 decimal places
    return '₦' + numAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Helper function to parse string to number safely
  const parseSafeNumber = (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitPayment();
  };

  const submitPayment = async () => {
    const amount = parseSafeNumber(formData.amount_paid);
    
    if (!amount || amount <= 0) {
      showError("Please enter a valid payment amount");
      return;
    }

    if (amount > credit.outstanding_amount) {
      showError(`Payment amount cannot exceed outstanding amount (${formatCurrency(credit.outstanding_amount)})`);
      return;
    }

    if (!formData.customer_name.trim()) {
      showError("Please enter customer name");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        showError("Authentication token not found. Please login again.");
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/api/sales/credits/${credit.id}/clear/`, {
        method: "POST",
        body: JSON.stringify({
          amount_paid: amount,
          customer_name: formData.customer_name,
          payment_method: formData.payment_method,
          remarks: formData.remarks
        })
      });

      if (response.ok) {
        showSuccess("Credit payment recorded successfully!");
        onCreditCleared();
        onClose();
      } else {
        const errorData = await response.json();
        showError(errorData.detail || errorData.message || `Failed to record payment (Status: ${response.status})`);
      }
    } catch (error: any) {
      console.error("Network error recording payment:", error);
      showError(`Network error: ${error.message || "Failed to connect to server"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        submitPayment();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  const currentPayment = parseSafeNumber(formData.amount_paid);
  const isFullPayment = currentPayment === credit.outstanding_amount;
  const newAmountPaid = credit.amount_paid + currentPayment;
  const remainingBalance = credit.outstanding_amount - currentPayment;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Clear Outstanding Credit</h2>
              <p className="text-sm text-gray-600">Record payment for credit sale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Credit Info */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Credit Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Invoice ID:</span>
                <span className="text-sm font-medium text-gray-900 bg-white px-3 py-1 rounded">{credit.invoice_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-sm font-medium text-gray-900">{formatCurrency(credit.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount Paid:</span>
                <span className="text-sm font-medium text-green-700">{formatCurrency(credit.amount_paid)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Outstanding:</span>
                <span className="text-sm font-medium text-red-700">{formatCurrency(credit.outstanding_amount)}</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" onKeyDown={handleKeyDown}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount (₦)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Banknote className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={amountInputRef}
                  type="number"
                  name="amount_paid"
                  value={formData.amount_paid}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={credit.outstanding_amount}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Maximum: {formatCurrency(credit.outstanding_amount)}
                {isFullPayment && (
                  <span className="text-green-600 ml-2 font-medium">← Full payment will mark as cleared</span>
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition appearance-none"
                  disabled={loading}
                >
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="pos">POS</option>
                  <option value="bank">Bank Deposit</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 flex items-center pointer-events-none">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                </div>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Enter any remarks about this payment"
                  rows={3}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition resize-none"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <h3 className="text-sm font-medium text-green-800 mb-3">Payment Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">New Payment:</span>
                  <span className="text-sm font-semibold text-green-700">
                    {formatCurrency(currentPayment)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600">New Amount Paid:</span>
                  <span className="text-sm font-semibold text-green-700">
                    {formatCurrency(newAmountPaid)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600">Remaining Balance:</span>
                  <span className="text-sm font-semibold text-red-700">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
                {isFullPayment && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-xs text-green-700 font-medium">
                        Full payment will mark this credit as cleared
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Cancel (Esc)
            </button>
            <button
              type="button"
              onClick={submitPayment}
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span>
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Record Payment (Enter)
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Enter</kbd> to submit • Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to cancel
          </p>
        </div>
      </div>
    </div>
  );
}
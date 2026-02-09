
"use client";
import { useState, useEffect } from "react";
import { X, History, DollarSign, Calendar, User, FileText } from "lucide-react";
import { Credit, CreditPayment } from "@/app/types";
import { showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";

interface CreditHistoryModalProps {
  open: boolean;
  onClose: () => void;
  credit: Credit;
}

export default function CreditHistoryModal({ open, onClose, credit }: CreditHistoryModalProps) {
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && credit.id) {
      fetchPaymentHistory();
    }
  }, [open, credit.id]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      // Get the credit details which includes payments
      const response = await apiFetch(`/api/sales/credits/${credit.id}/`);
      
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      } else {
        showError("Failed to load payment history");
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      showError("Error loading payment history");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
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
      transfer: 'bg-blue-100 text-blue-800',
      pos: 'bg-purple-100 text-purple-800',
      bank: 'bg-indigo-100 text-indigo-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[method as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {method.toUpperCase()}
      </span>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Payment History</h2>
              <p className="text-sm text-gray-600">{credit.invoice_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Credit Summary */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Customer</p>
              <p className="font-semibold text-gray-900">{credit.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Amount</p>
              <p className="font-semibold text-gray-900">₦{formatCurrency(credit.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Amount Paid</p>
              <p className="font-semibold text-green-700">₦{formatCurrency(credit.amount_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Outstanding</p>
              <p className="font-semibold text-red-700">₦{formatCurrency(credit.outstanding_amount)}</p>
            </div>
          </div>
        </div>

        {/* Payment History List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payment history available</p>
              <p className="text-sm text-gray-500 mt-2">Payments will appear here when recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div
                  key={payment.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Payment #{payments.length - index}
                        </p>
                        <p className="text-sm text-gray-600">
                          By {payment.customer_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-700">
                        ₦{formatCurrency(payment.amount)}
                      </p>
                      {getPaymentMethodBadge(payment.payment_method)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {formatDateTime(payment.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {payment.recorded_by_name || 'System'}
                      </span>
                    </div>
                  </div>

                  {payment.remarks && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Remarks:</p>
                          <p className="text-sm text-gray-700">{payment.remarks}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{payments.length}</span> payment(s) recorded
          </div>
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

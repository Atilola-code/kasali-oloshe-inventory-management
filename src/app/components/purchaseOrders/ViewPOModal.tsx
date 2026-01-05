// src/app/components/purchaseOrders/ViewPOModal.tsx
"use client";
import { X, Package, Calendar, User, FileText, Clock } from "lucide-react";
import { PurchaseOrder } from "@/app/types";

interface ViewPOModalProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
}

export default function ViewPOModal({ open, onClose, po }: ViewPOModalProps) {
  if (!open || !po) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{po.po_number}</h2>
              <p className="text-sm text-gray-600">Purchase Order Details</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(po.status)}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Supplier Name</label>
                  <p className="font-medium text-gray-900">{po.supplier_name}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Order Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{formatDate(po.order_date)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Expected Delivery</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{formatDate(po.expected_delivery)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Created By</label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{po.created_by_name || 'N/A'}</p>
                  </div>
                </div>
                {po.approved_by_name && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Approved By</label>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{po.approved_by_name}</p>
                    </div>
                  </div>
                )}
                {po.received_by_name && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Received By</label>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="font-medium text-gray-900">{po.received_by_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Order Items</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {po.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.product_sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">₦{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          ₦{formatCurrency(item.subtotal || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Total Amount:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        ₦{formatCurrency(po.total_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Stock Value:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-green-700 text-right">
                        ₦{formatCurrency(po.stock_value)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {po.notes && (
              <div>
                <label className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{po.notes}</p>
                </div>
              </div>
            )}

            {/* History */}
            {po.history && po.history.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">History</h3>
                <div className="space-y-3">
                  {po.history.map((entry) => (
                    <div key={entry.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{entry.action}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            By {entry.performed_by_name} • {formatDateTime(entry.timestamp)}
                          </p>
                          {entry.notes && (
                            <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
                          )}
                        </div>
                        {entry.new_status && (
                          <div>{getStatusBadge(entry.new_status)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
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
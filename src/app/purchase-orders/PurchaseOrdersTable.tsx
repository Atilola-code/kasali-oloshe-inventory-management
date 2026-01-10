"use client";
import React, { useState } from "react";
import { MoreVertical, Eye } from "lucide-react";
import { PurchaseOrder } from "../types";
import { POTableSkeleton } from "../components/purchaseOrders/POSkeleton";

interface PurchaseOrdersTableProps {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  onViewPO: (po: PurchaseOrder) => void;
  onChangeStatus: (po: PurchaseOrder, newStatus: string) => void;
  dropdownOpen: string | null;
  onDropdownToggle: (id: string | null) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getAvailableStatusChanges: (currentStatus: string) => string[];
}

export default function PurchaseOrdersTable({
  purchaseOrders,
  loading,
  onViewPO,
  onChangeStatus,
  dropdownOpen,
  onDropdownToggle,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getAvailableStatusChanges
}: PurchaseOrdersTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">PO Number</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Order Date</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Expected Delivery</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Stock Value</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <POTableSkeleton />
            ) : purchaseOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No purchase orders found
                </td>
              </tr>
            ) : (
              purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">{po.po_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{po.supplier_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(po.order_date)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(po.expected_delivery)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    ₦{formatCurrency(po.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-700 text-right">
                    ₦{formatCurrency(po.stock_value)}
                  </td>
                  <td className="px-6 py-4 text-sm">{getStatusBadge(po.status)}</td>
                  <td className="px-6 py-4 text-sm relative">
                    <button
                      onClick={() => onDropdownToggle(dropdownOpen === po.id.toString() ? null : po.id.toString())}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {dropdownOpen === po.id.toString() && (
                      <div className="absolute right-6 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => onViewPO(po)}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View PO
                          </button>
                          {getAvailableStatusChanges(po.status).map((status) => (
                            <button
                              key={status}
                              onClick={() => onChangeStatus(po, status)}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Change to {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
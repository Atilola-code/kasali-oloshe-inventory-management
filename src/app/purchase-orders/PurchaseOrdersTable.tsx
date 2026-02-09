// src/app/purchase-orders/PurchaseOrdersTable.tsx - FIXED DROPDOWN ACTIONS
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MoreVertical, Eye, Edit, CheckCircle, Clock, XCircle } from "lucide-react";
import { Product, PurchaseOrder } from "../types";
import { POTableSkeleton } from "../components/purchaseOrders/POSkeleton";
import EditPOModal from "../components/purchaseOrders/EditPOModal";

interface PurchaseOrdersTableProps {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  onViewPO: (po: PurchaseOrder) => void;
  onChangeStatus: (po: PurchaseOrder, newStatus: string) => Promise<void>;
  dropdownOpen: string | null;
  onDropdownToggle: (id: string | null) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => React.ReactElement;
  getAvailableStatusChanges: (currentStatus: string) => string[];
  products: Product[];
  onRefresh: () => void; 
  filterStatus: string;
}

const PurchaseOrdersTable: React.FC<PurchaseOrdersTableProps> = ({
  purchaseOrders,
  loading,
  onViewPO,
  onChangeStatus,
  dropdownOpen,
  onDropdownToggle,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getAvailableStatusChanges,
  products,
  onRefresh,
  filterStatus
}) => {
  const [editPOModalOpen, setEditPOModalOpen] = useState(false);
  const [selectedPOForEdit, setSelectedPOForEdit] = useState<PurchaseOrder | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const setDropdownRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    dropdownRefs.current[id] = el;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && dropdownRefs.current[dropdownOpen]) {
        const dropdownElement = dropdownRefs.current[dropdownOpen];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          onDropdownToggle(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, onDropdownToggle]);

  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPOForEdit(po);
    setEditPOModalOpen(true);
    onDropdownToggle(null);
  };

  const handlePOUpdated = () => {
    setEditPOModalOpen(false);
    setSelectedPOForEdit(null);
    onRefresh(); 
  };

  // ✅ Helper function to get status change display info
  const getStatusChangeInfo = (status: string) => {
    const statusInfo = {
      pending: { label: 'Change to Pending', icon: Clock, color: 'text-yellow-600' },
      approved: { label: 'Change to Approved', icon: CheckCircle, color: 'text-blue-600' },
      received: { label: 'Mark as Received', icon: CheckCircle, color: 'text-green-600' },
      cancelled: { label: 'Cancel Purchase Order', icon: XCircle, color: 'text-red-600' }
    };
    return statusInfo[status as keyof typeof statusInfo] || { 
      label: `Change to ${status.charAt(0).toUpperCase() + status.slice(1)}`, 
      icon: Clock, 
      color: 'text-gray-600' 
    };
  };

  // Function to render table rows
  const renderTableRows = () => {
    if (loading) {
      return <POTableSkeleton />;
    }

    if (purchaseOrders.length === 0) {
      const statusLabels: Record<string, string> = {
        draft: 'Draft',
        pending: 'Pending',
        approved: 'Approved',
        received: 'Received',
        cancelled: 'Cancelled'
      };
      
      const message = filterStatus === 'all' 
        ? "No purchase orders found"
        : `No purchase orders match status "${statusLabels[filterStatus] || filterStatus}"`;

      return (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
            {message}
          </td>
        </tr>
      );
    }

    return purchaseOrders.map((po) => {
      const availableStatusChanges = getAvailableStatusChanges(po.status);
      
      return (
        <tr key={po.id} className="hover:bg-gray-50 transition relative">
          <td className="px-6 py-4 text-sm font-medium text-blue-600 whitespace-nowrap">{po.po_number}</td>
          <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{po.supplier_name}</td>
          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(po.order_date)}</td>
          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatDate(po.expected_delivery)}</td>
          <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
            ₦{formatCurrency(po.total_amount)}
          </td>
          <td className="px-6 py-4 text-sm font-semibold text-green-700 text-right whitespace-nowrap">
            ₦{formatCurrency(po.stock_value)}
          </td>
          <td className="px-6 py-4 text-sm whitespace-nowrap">{getStatusBadge(po.status)}</td>
          <td className="px-6 py-4 text-sm relative whitespace-nowrap">
            <div className="relative">
              <button
                onClick={() => onDropdownToggle(dropdownOpen === po.id.toString() ? null : po.id.toString())}
                className="p-1 hover:bg-gray-100 rounded relative z-10"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {dropdownOpen === po.id.toString() && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => onDropdownToggle(null)}
                  />
                  
                  <div 
                    ref={setDropdownRef(po.id.toString())}
                    className="absolute right-0 w-56 bg-white rounded-lg shadow-xl z-50 border border-gray-200"
                    style={{ 
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      top: '100%',
                      marginTop: '0.25rem'
                    }}
                  >
                    <div className="py-2">
                      {/* ✅ VIEW PO - Always show first */}
                      <button
                        onClick={() => onViewPO(po)}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-3 text-blue-500" />
                        <div className="text-left">
                          <div className="font-medium">View PO</div>
                          <div className="text-xs text-gray-500">View details & print</div>
                        </div>
                      </button>

                      {/* ✅ EDIT PO - Show for non-received/non-cancelled POs */}
                      {po.status !== 'received' && po.status !== 'cancelled' && (
                        <button
                          onClick={() => handleEditPO(po)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-3 text-orange-500" />
                          <div className="text-left">
                            <div className="font-medium">Edit PO</div>
                            <div className="text-xs text-gray-500">Modify order details</div>
                          </div>
                        </button>
                      )}

                      {/* ✅ Divider if there are status changes available */}
                      {availableStatusChanges.length > 0 && (
                        <div className="border-t border-gray-200 my-1"></div>
                      )}

                      {/* ✅ STATUS CHANGES - Show all available transitions */}
                      {availableStatusChanges.map((status) => {
                        const statusInfo = getStatusChangeInfo(status);
                        const StatusIcon = statusInfo.icon;
                        const isCancellation = status === 'cancelled';
                        
                        return (
                          <button
                            key={status}
                            onClick={() => onChangeStatus(po, status)}
                            className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                              isCancellation 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <StatusIcon className={`w-4 h-4 mr-3 ${statusInfo.color}`} />
                            <div className="text-left">
                              <div className="font-medium">{statusInfo.label}</div>
                              <div className={`text-xs ${isCancellation ? 'text-red-500' : 'text-gray-500'}`}>
                                {isCancellation ? 'Mark as cancelled' : 'Update status'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Dropdown arrow */}
                    <div 
                      className="absolute -top-2 right-4 w-4 h-4 bg-white transform rotate-45 border-t border-l border-gray-200"
                      style={{ 
                        boxShadow: '-1px -1px 1px rgba(0,0,0,0.05)'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
        <div 
          ref={tableContainerRef}
          className="flex flex-col h-full overflow-hidden"
        >
          <div className="overflow-x-auto flex-1 relative">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Sticky header */}
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">PO Number</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Order Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Expected Delivery</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Stock Value</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              
              {/* Scrollable body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {renderTableRows()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {selectedPOForEdit && (
        <EditPOModal
          open={editPOModalOpen}
          onClose={() => {
            setEditPOModalOpen(false);
            setSelectedPOForEdit(null);
          }}
          po={selectedPOForEdit}
          products={products}
          onPOUpdated={handlePOUpdated}
        />
      )}
    </>
  );
};

export default PurchaseOrdersTable;
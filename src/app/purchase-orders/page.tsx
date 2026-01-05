"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, RefreshCw, Package, TrendingUp, FileText, CheckCircle } from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import CreatePOModal from "../components/purchaseOrders/CreatePOModal";
import ViewPOModal from "../components/purchaseOrders/ViewPOModal";
import { PurchaseOrder, Product, POStatistics } from "../types";
import { showSuccess, showError } from "@/app/utils/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PurchaseOrdersPage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [statistics, setStatistics] = useState<POStatistics | null>(null);
  const [productsLoading, setProductsLoading] = useState(true); // Add loading state for products

  useEffect(() => {
    fetchPurchaseOrders();
    fetchProducts();
    fetchStatistics();
  }, [filterStatus]);

  async function fetchPurchaseOrders() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = `${API_URL}/api/purchase-orders/`;
      
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setPurchaseOrders(data);
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    setProductsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/inventory/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setProductsLoading(false);
    }
  }

  async function fetchStatistics() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/purchase-orders/statistics/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  }

  async function handleChangeStatus(po: PurchaseOrder, newStatus: string) {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/purchase-orders/${po.id}/change_status/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showSuccess(`Status changed to ${newStatus}`);
        fetchPurchaseOrders();
        fetchStatistics();
      } else {
        const errorData = await response.json();
        showError(errorData.error || "Failed to change status");
      }
    } catch (error) {
      console.error("Error changing status:", error);
      showError("Error changing status");
    }
    setDropdownOpen(null);
  }

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setViewModalOpen(true);
    setDropdownOpen(null);
  };

  const handleRefresh = () => {
    fetchPurchaseOrders();
    fetchProducts(); // Also refresh products
    fetchStatistics();
    showSuccess("Data refreshed!");
  };

  const filteredPOs = purchaseOrders.filter(po =>
    po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getAvailableStatusChanges = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      draft: ['pending'],
      pending: ['approved'],
      approved: ['received'],
      received: [],
      cancelled: []
    };
    return transitions[currentStatus] || [];
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          <main className="pt-20 p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <div className="mt-4">
                  <h1 className="text-3xl font-bold text-gray-800">Purchase Orders</h1>
                  <p className="text-gray-600 mt-1">Manage procurement and supplier orders</p>
                </div>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  disabled={productsLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition mr-8 ${
                    productsLoading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Create PO
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by PO number or supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleRefresh}
                  className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50"
                  title="Refresh"
                >
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="received">Received</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total POs</p>
                      <p className="text-2xl font-bold text-gray-900">{statistics.total_purchase_orders}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-900">{statistics.pending}</p>
                    </div>
                    <FileText className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Received</p>
                      <p className="text-2xl font-bold text-green-900">{statistics.received}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-blue-900">₦{formatCurrency(statistics.total_value)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
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
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          Loading purchase orders...
                        </td>
                      </tr>
                    ) : filteredPOs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          No purchase orders found
                        </td>
                      </tr>
                    ) : (
                      filteredPOs.map((po) => (
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
                              onClick={() => setDropdownOpen(dropdownOpen === po.id.toString() ? null : po.id.toString())}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>

                            {dropdownOpen === po.id.toString() && (
                              <div className="absolute right-6 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleViewPO(po)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View PO
                                  </button>
                                  {getAvailableStatusChanges(po.status).map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleChangeStatus(po, status)}
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
          </main>
        </div>
      </div>

      {/* Modals */}
      {productsLoading || products.length === 0 ? (
        createModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700">Loading products...</p>
            </div>
          </div>
        )
      ) : (
        <CreatePOModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          products={products}
          onPOCreated={() => {
            fetchPurchaseOrders();
            fetchStatistics();
          }}
        />
      )}

      <ViewPOModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedPO(null);
        }}
        po={selectedPO}
      />
    </ProtectedRoute>
  );
}
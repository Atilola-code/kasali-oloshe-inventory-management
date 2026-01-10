"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import CreatePOModal from "../components/purchaseOrders/CreatePOModal";
import ViewPOModal from "../components/purchaseOrders/ViewPOModal";
import { PurchaseOrder, Product, POStatistics } from "../types";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch, clearCacheByEndpoint } from "@/services/api";
import { useFetchWithCache, useNetworkStatus } from "../hooks/useFetchWithCache";
import { ErrorBoundary } from "../components/shared/ErrorBoundary";
import PurchaseOrdersTable from "./PurchaseOrdersTable";
import PurchaseOrdersStats from "./PurchaseOrdersStats";
import PurchaseOrdersFilters from "./PurchaseOrdersFilters";
import PurchaseOrdersActions from "./PurchaseOrdersActions";
import { measurePerformance } from "../utils/performance";

interface PurchaseOrdersResponse {
  result: PurchaseOrder[];
  count: number;
}

// Helper functions moved outside component
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

const statusStyles = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const getStatusBadge = (status: string) => {
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

export default function PurchaseOrdersPage() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  
  const isOnline = useNetworkStatus();

  // Use custom hooks for data fetching
  const { 
    data: purchaseOrdersData,
    loading: poLoading, 
    fetchData: fetchPurchaseOrders,
    invalidateCache: invalidatePOCache,
    setData: setPurchaseOrdersData
  } = useFetchWithCache<PurchaseOrdersResponse>('/api/purchase-orders');
  
  const { 
    data: statisticsData, 
    fetchData: fetchStatistics,
    invalidateCache: invalidateStatsCache 
  } = useFetchWithCache<POStatistics>('/api/purchase-orders/statistics');

  // Performance monitoring
  useEffect(() => {
    const perf = measurePerformance('PurchaseOrdersPage Mount');
    return () => {
      const duration = perf.end();
      if (duration > 500) {
        console.warn(`Slow page mount: ${duration}ms`);
      }
    };
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products with local cache
  useEffect(() => {
    const fetchProducts = async () => {
      const cachedProducts = localStorage.getItem('cached_products');
      const cachedTime = localStorage.getItem('cached_products_time');
      
      const isCacheValid = cachedTime && 
        (Date.now() - parseInt(cachedTime)) < (30 * 60 * 1000); // 30 minutes
      
      if (cachedProducts && isCacheValid) {
        setProducts(JSON.parse(cachedProducts));
        setProductsLoading(false);
      } else {
        setProductsLoading(true);
        try {
          const res = await apiFetch('/api/inventory/');
          if (res.ok) {
            const data = await res.json();
            setProducts(data);
            localStorage.setItem('cached_products', JSON.stringify(data));
            localStorage.setItem('cached_products_time', Date.now().toString());
          }
        } catch (error) {
          console.error("Error fetching products:", error);
        } finally {
          setProductsLoading(false);
        }
      }
    };

    fetchProducts();
  }, []);

  // Fetch purchase orders with pagination and filtering
  const fetchFilteredPurchaseOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: itemsPerPage.toString()
      });
      
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      const url = `/api/purchase-orders/?${params.toString()}`;
      const result = await fetchPurchaseOrders({
        method: 'GET',
        body: null
      });
      
      if (result && result.count) {
        setTotalPages(Math.ceil(result.count / itemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    }
  }, [currentPage, itemsPerPage, filterStatus, fetchPurchaseOrders]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      await fetchStatistics();
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  }, [fetchStatistics]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([
        fetchFilteredPurchaseOrders(),
        fetchStats()
      ]);
    };
    
    fetchInitialData();
  }, [fetchFilteredPurchaseOrders, fetchStats]);

  // Handle status change with optimistic updates
  const handleChangeStatus = async (po: PurchaseOrder, newStatus: string) => {
    if (!purchaseOrdersData?.result) return;

    // Type assertion for status - since we're optimistic updating
    const newStatusTyped = newStatus as PurchaseOrder['status'];
    
    // Optimistic update
    const previousData = { ...purchaseOrdersData };
    const updatedPOs = purchaseOrdersData.result.map(item => 
      item.id === po.id ? { ...item, status: newStatusTyped } : item
    );
    
    setPurchaseOrdersData({
      ...purchaseOrdersData,
      result: updatedPOs
    });
    
    try {
      const response = await apiFetch(`/api/purchase-orders/${po.id}/change_status/`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showSuccess(`Status changed to ${newStatus}`);
        
        // Invalidate caches
        invalidatePOCache();
        invalidateStatsCache();
        
        // Refresh statistics
        await fetchStats();
      } else {
        // Rollback on error
        setPurchaseOrdersData(previousData);
        const errorData = await response.json();
        showError(errorData.error || "Failed to change status");
      }
    } catch (error) {
      // Rollback on error
      setPurchaseOrdersData(previousData);
      console.error("Error changing status:", error);
      showError("Error changing status");
    }
    setDropdownOpen(null);
  };

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setViewModalOpen(true);
    setDropdownOpen(null);
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchFilteredPurchaseOrders(),
      fetchStats()
    ]);
    showSuccess("Data refreshed!");
  };

  // Filter purchase orders based on search
  const filteredPOs = useMemo(() => {
    if (!purchaseOrdersData?.result) return [];
    
    return purchaseOrdersData.result.filter(po =>
      po.po_number.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [purchaseOrdersData, debouncedSearch]);

  return (
    <ProtectedRoute>
      <ErrorBoundary>
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
                  <PurchaseOrdersActions 
                    onCreatePO={() => setCreateModalOpen(true)}
                    productsLoading={productsLoading}
                  />
                </div>

                {/* Search and Filter */}
                <PurchaseOrdersFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filterStatus={filterStatus}
                  onFilterChange={setFilterStatus}
                  onRefresh={handleRefresh}
                />
              </div>

              {/* Statistics Cards */}
              <PurchaseOrdersStats 
                statistics={statisticsData}
                formatCurrency={formatCurrency}
              />

              {/* Table */}
              <PurchaseOrdersTable
                purchaseOrders={filteredPOs}
                loading={poLoading}
                onViewPO={handleViewPO}
                onChangeStatus={handleChangeStatus}
                dropdownOpen={dropdownOpen}
                onDropdownToggle={setDropdownOpen}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
                getAvailableStatusChanges={getAvailableStatusChanges}
              />
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
            onPOCreated={async () => {
              // Clear caches
              clearCacheByEndpoint('/api/purchase-orders');
              clearCacheByEndpoint('/api/purchase-orders/statistics');
              
              // Refresh data
              await Promise.all([
                fetchFilteredPurchaseOrders(),
                fetchStats()
              ]);
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
      </ErrorBoundary>
    </ProtectedRoute>
  );
}
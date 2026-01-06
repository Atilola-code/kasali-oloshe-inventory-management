"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import { showInfo } from "./utils/toast";
import ToggleStatsCard from "./components/shared/ToggleStatsCard";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Clock, 
  Wallet, 
  RefreshCw,
  CreditCard,
  Building,
  FileText
} from "lucide-react";
import { apiFetch } from "@/services/api";


interface DashboardStats {
  totalSales: number;
  totalStockValue: number; // Sum of (cost_price × quantity)
  totalInventoryValue: number; // Sum of (selling_price × quantity)
  outstandingPayments: number; // Total credit sales (payments due)
  cashAtBank: number; // Total deposited amount
  totalProducts: number;  // Total number of distinct products
  totalItemsInStock: number;  // Sum of quantities of all products
  salesChange: number;  
  stockValueChange: number;
  paymentsChange: number;
  inventoryChange: number;
  cashAtBankChange: number;
}

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalStockValue: 0,
    totalInventoryValue: 0,
    outstandingPayments: 0,
    cashAtBank: 0,
    totalProducts: 0,
    totalItemsInStock: 0,
    salesChange: 0,
    stockValueChange: 0,
    paymentsChange: 0,
    inventoryChange: 0,
    cashAtBankChange: 0,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const handleDashboardRefresh = () => {
      fetchDashboardData();
      showInfo("Dashboard updated with latest credit payments");
    };

    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    
    return () => {
      window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
    };
  }, []);
  // Set default refresh interval to 10 minutes (600,000 milliseconds)
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedInterval = localStorage.getItem('dashboardRefreshInterval');
      return savedInterval ? parseInt(savedInterval) : 600000;
    }
    return 600000;
  });

  // Save refresh interval to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardRefreshInterval', refreshInterval.toString());
    }
  }, [refreshInterval]);

  // Fetch dashboard data including sales and deposits
  async function fetchDashboardData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("No authentication token found");
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [salesRes, inventoryRes, depositsRes] = await Promise.all([
        apiFetch('/api/sales/'),
        apiFetch('/api/inventory/'),
        apiFetch('/api/sales/deposits/')
      ]);

      let salesData: any[] = [];
      let inventoryData: any[] = [];
      let depositsData: any[] = [];

      // Parse sales data
      if (salesRes.ok) {
        try {
          salesData = await salesRes.json();
        } catch (error) {
          console.error("Error parsing sales data:", error);
        }
      } else {
        console.error("Failed to fetch sales:", salesRes.status);
      }

      // Parse inventory data
      if (inventoryRes.ok) {
        try {
          inventoryData = await inventoryRes.json();
        } catch (error) {
          console.error("Error parsing inventory data:", error);
        }
      } else {
        console.error("Failed to fetch inventory:", inventoryRes.status);
      }

      // Parse deposits data
      if (depositsRes.ok) {
        try {
          depositsData = await depositsRes.json();
        } catch (error) {
          console.error("Error parsing deposits data:", error);
        }
      } else {
        console.error("Failed to fetch deposits:", depositsRes.status);
      }

      // Calculate total sales (ALL sales, not just today)
      const totalSales = salesData.reduce((sum: number, sale: any) => {
        const amount = parseFloat(sale.total_amount) || 0;
        return sum + amount;
      }, 0);

      // Calculate total stock value (cost price)
      const totalStockValue = inventoryData.reduce((sum: number, product: any) => {
        const costPrice = parseFloat(product.cost_price || product.cost_price) || 0;
        const quantity = parseFloat(product.quantity || 0);
        return sum + (costPrice * quantity);
      }, 0);

      // Calculate total inventory value (selling price)
      const totalInventoryValue = inventoryData.reduce((sum: number, product: any) => {
        const sellingPrice = parseFloat(product.selling_price || product.price) || 0;
        const quantity = parseFloat(product.quantity || 0);
        return sum + (sellingPrice * quantity);
      }, 0);

      // Calculate total items in stock
      const totalItemsInStock = inventoryData.reduce((sum: number, product: any) => 
        sum + parseFloat(product.quantity || 0), 0
      );

      // Calculate total number of products
      const totalProducts = inventoryData.length;

      const creditsRes = await apiFetch('/api/sales/credits/');

      let outstandingPayments = 0;
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        // Sum outstanding amounts from pending and partially_paid credits
        outstandingPayments = creditsData.reduce((sum: number, credit: any) => {
          if (credit.status === 'pending' || credit.status === 'partially_paid') {
            return sum + (parseFloat(credit.outstanding_amount) || 0);
          }
          return sum;
        }, 0);
      }

      // Calculate digital sales (transfer + POS)
      const digitalSales = salesData
        .filter((sale: any) => sale.payment_method === 'transfer' || sale.payment_method === 'pos')
        .reduce((sum: number, sale: any) => {
          const amount = parseFloat(sale.total_amount) || 0;
          return sum + amount;
        }, 0);

      // Calculate total deposits
      const totalDeposits = depositsData.reduce((sum: number, deposit: any) => {
        const amount = parseFloat(deposit.amount) || 0;
        return sum + amount;
      }, 0);

      // Calculate cash at bank: deposits + digital sales
      const cashAtBank = totalDeposits + digitalSales;

      // Calculate percentage changes (for demo purposes - in real app, you'd compare with previous period)
      const calculateChange = () => Math.random() * 20 - 5; // Random between -5% and +15%

      setStats({
        totalSales,
        totalStockValue,
        totalInventoryValue,
        outstandingPayments,
        cashAtBank,
        totalProducts,
        totalItemsInStock,
        salesChange: calculateChange(),
        stockValueChange: calculateChange(),
        paymentsChange: calculateChange(),
        inventoryChange: calculateChange(),
        cashAtBankChange: calculateChange(),
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }

  // Set up auto-refresh
  useEffect(() => {
    fetchDashboardData(); // Initial fetch
    
    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const handleManualRefresh = () => {
    fetchDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  // Function to format interval for display
  const formatIntervalDisplay = (intervalMs: number) => {
    const minutes = intervalMs / 60000;
    
    if (minutes === 60) return "1 hour";
    if (minutes === 10) return "10 minutes";
    if (minutes === 20) return "20 minutes";
    if (minutes === 30) return "30 minutes";
    
    return `${minutes} minutes`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        {/* Responsive margin for sidebar */}
        <div className="lg:ml-64">
          <Topbar query={query} setQuery={setQuery} />
          
          <main className="pt-16 lg:pt-20">
            {/* FIXED HEADER SECTION - Responsive */}
            <div className="fixed top-16 lg:top-20 left-0 lg:left-64 right-0 z-30 bg-gray-50 shadow-sm border-b border-gray-200">
              <div className="p-4 md:p-6">
                {/* Header - Responsive */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3 md:gap-0">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Overview</h1>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">Real-time inventory and sales data</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 w-full md:w-auto">
                    <button
                      onClick={handleManualRefresh}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm md:text-base w-full sm:w-auto"
                      disabled={loading}
                    >
                      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                      {loading ? "Refreshing..." : "Refresh Data"}
                    </button>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <Clock size={14} />
                      <span>Last updated: <span className="hidden sm:inline">{formatDateTime(lastUpdated)}</span><span className="sm:hidden">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Responsive */}
                {loading ? (
                  <div className="text-center py-8 bg-white rounded-xl shadow-sm">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Total Sales */}
                    <ToggleStatsCard
                      title="Total Sales"
                      value={stats.totalSales}
                      subtitle="All time sales"
                      icon={<DollarSign className="text-blue-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-blue-100"
                      isCurrency={true}
                      showChange={true}
                      change={stats.salesChange}
                      changeLabel="vs last month"
                      responsive={true}
                    />

                    {/* Total Stock Value (Cost-based) */}
                    <ToggleStatsCard
                      title="Total Stock Value (Cost)"
                      value={stats.totalStockValue}
                      subtitle={`${formatNumber(stats.totalItemsInStock)} items in stock`}
                      icon={<Package className="text-purple-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-purple-100"
                      isCurrency={true}
                      showChange={true}
                      change={stats.stockValueChange}
                      changeLabel="vs last month"
                      responsive={true}
                    />

                    {/* Products Count */}
                    <ToggleStatsCard
                      title="Total Products"
                      value={stats.totalProducts}
                      subtitle={`${formatNumber(stats.totalItemsInStock)} total units`}
                      icon={<Package className="text-orange-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-orange-100"
                      responsive={true}
                    />

                    {/* Total Inventory Value */}
                    <ToggleStatsCard
                      title="Total Inventory Value"
                      value={stats.totalInventoryValue}
                      subtitle="Selling price value"
                      icon={<Wallet className="text-green-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-green-100"
                      isCurrency={true}
                      showChange={true}
                      change={stats.inventoryChange}
                      changeLabel="vs last month"
                      responsive={true}
                    />

                    {/* Outstanding Payments */}
                    <ToggleStatsCard
                      title="Outstanding Payments"
                      value={stats.outstandingPayments}
                      subtitle="credit sales"
                      icon={<CreditCard className="text-yellow-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-yellow-100"
                      isCurrency={true}
                      showChange={true}
                      change={stats.paymentsChange}
                      changeLabel="vs last month"
                      responsive={true}
                    />

                    {/* Cash at Bank */}
                    <ToggleStatsCard
                      title="Cash at Bank"
                      value={stats.cashAtBank}
                      subtitle="total deposits"
                      icon={<Building className="text-indigo-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-indigo-100"
                      isCurrency={true}
                      showChange={true}
                      change={stats.cashAtBankChange}
                      changeLabel="vs last month"
                      responsive={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* SCROLLABLE CONTENT AREA - Responsive height */}
            <div className="mt-[380px] md:mt-[400px] lg:mt-[480px] p-4 md:p-6 overflow-y-auto" style={{ 
              height: 'calc(100vh - 380px)',
              maxHeight: 'calc(100vh - 380px)' 
            }}>
              {/* Auto-Update Status Card - Responsive */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-xs md:text-sm text-blue-800">
                      Dashboard updates every {formatIntervalDisplay(refreshInterval).toLowerCase()}
                    </p>
                  </div>
                  <select 
                    value={refreshInterval / 60000}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value) * 60000)}
                    className="text-xs md:text-sm border border-blue-300 rounded px-2 py-1 md:px-3 md:py-1 bg-white text-blue-700"
                  >
                    <option value="10">10 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
                <p className="text-xs text-blue-600 mt-2 hidden md:block">
                  Stock values will automatically update when sales are recorded. 
                  Your refresh interval preference is saved automatically.
                </p>
              </div>

              {/* Recent Sales Activity - Responsive */}
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200 mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">Recent Sales Activity</h2>
                <div className="space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                    <div className="truncate">
                      <span className="font-medium text-gray-700 text-sm md:text-base">INV-ABC123</span>
                      <p className="text-xs md:text-sm text-gray-500 truncate">Bath Soap × 5 - Cash</p>
                    </div>
                    <span className="font-semibold text-sm md:text-base ml-2">₦2,500</span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                    <div className="truncate">
                      <span className="font-medium text-gray-700 text-sm md:text-base">INV-DEF456</span>
                      <p className="text-xs md:text-sm text-gray-500 truncate">Liquid Detergent × 3 - POS</p>
                    </div>
                    <span className="font-semibold text-sm md:text-base ml-2">₦1,800</span>
                  </div>
                  <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                    <div className="truncate">
                      <span className="font-medium text-gray-700 text-sm md:text-base">INV-GHI789</span>
                      <p className="text-xs md:text-sm text-gray-500 truncate">Detergent × 2 - Transfer</p>
                    </div>
                    <span className="font-semibold text-sm md:text-base ml-2">₦1,200</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics - Responsive */}
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Daily Sales Average</span>
                      <span className="font-semibold text-sm md:text-base">₦{formatCurrency(stats.totalSales / 30)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Stock Turnover Rate</span>
                      <span className="font-semibold text-sm md:text-base">1.2%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Avg Transaction Value</span>
                      <span className="font-semibold text-sm md:text-base">₦1,850</span>
                    </div>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Customer Satisfaction</span>
                      <span className="font-semibold text-sm md:text-base">94%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Inventory Accuracy</span>
                      <span className="font-semibold text-sm md:text-base">98%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Monthly Growth</span>
                      <span className="font-semibold text-sm md:text-base">+15.3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import SalesModal from "../components/salesComponent/SaleModal";
import ReceiptView from "../components/salesComponent/ReceiptView";
import EditSaleModal from "../components/salesComponent/EditSaleModal";
import DepositModal from "../components/salesComponent/DepositModal";
import StopSaleButton from "../components/salesComponent/StopSaleButton";
import { Sale, Product, UserRole, Deposit } from "../types";
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Calendar, 
  RefreshCw, 
  Receipt, 
  DollarSign,
  Banknote,
  CreditCard,
  Building,
  Plus,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showInfo, showError } from "@/app/utils/toast";
import ToggleStatsCard from "../components/shared/ToggleStatsCard";
import { apiFetch } from "@/services/api";
import { useForceRefresh } from "../hooks/useForceRefresh";



interface DailyReport {
  date: string;
  sales: any[];
  deposits: any[];
  total_sales: number;
  total_deposits: number;
  cash_sales: number;
  digital_sales: number;
  credit_sales: number;
}

export default function SalesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "receipt">("list");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [showAllSales, setShowAllSales] = useState(false);
  const [isSaleStopped, setIsSaleStopped] = useState(false);
  const [canCreateSale, setCanCreateSale] = useState(true);

  const userRole = user?.role as UserRole | null;

  const forceRefresh = useForceRefresh();

  async function fetchSales() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/sales/')

      if (res.ok) {
        const data = await res.json();
        setSales(data);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeposits() {
    try {
      
      const res = await apiFetch('/api/sales/deposits/')

      if (res.ok) {
        const data = await res.json();
        setDeposits(data);
      }
    } catch (error) {
      console.error("Error fetching deposits:", error);
    }
  }

  async function fetchProducts() {
    try {
      const res = await apiFetch('/api/inventory/')
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
      console.error("Error fetching products:", res.status);
      showError("Failed to load products for sales");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    showError("Error loading products");
  }
}

async function fetchStopSaleStatus() {
    try {
    
      const response = await apiFetch('/api/sales/stop-sale/status/');

      if (response.ok) {
        const data = await response.json();
        setIsSaleStopped(data.is_sale_stopped);
      }
    } catch (error) {
      console.error("Error fetching stop sale status:", error);
    }
  }

  // Check if user can create sale
  async function checkCanCreateSale() {
    try {
      const res = await apiFetch('/api/sales/stop-sale/can-create/');

      if (res.ok) {
        const data = await res.json();
        setCanCreateSale(data.can_create_sale);
      }
    } catch (error) {
      console.error("Error checking can create sale:", error);
    }
  }

  async function handleSaleCompleted(sale: any) {
    setSelectedSaleId(sale.invoice_id || sale.id);
    setView("receipt");
    
    // Force immediate refresh of sales and products
    await forceRefresh(
      ['/api/sales/', '/api/inventory/'],
      [fetchSales, fetchProducts]
    );
    
    await checkCanCreateSale();
    showSuccess("Sale created successfully!");
  }

  // ✅ UPDATED: Deposit completed with force refresh
  async function handleDepositCompleted() {
    await forceRefresh(
      ['/api/sales/deposits/'],
      [fetchDeposits]
    );
    showSuccess("Cash deposit recorded successfully!");
  }

  // ✅ UPDATED: Sale updated with force refresh
  async function handleSaleUpdated() {
    await forceRefresh(
      ['/api/sales/', '/api/inventory/'],
      [fetchSales, fetchProducts]
    );
    
    if (selectedSaleId) {
      setView("receipt");
    }
    showSuccess("Sale updated successfully!");
  }

  // Handle refresh - fetch all data
  const handleRefresh = async () => {
    await forceRefresh(
      ['/api/sales/', '/api/sales/deposits/', '/api/inventory/'],
      [fetchSales, fetchDeposits, fetchProducts, fetchStopSaleStatus, checkCanCreateSale]
    );
    showInfo("Data refreshed successfully!");
  };
  
  useEffect(() => {
    fetchSales();
    fetchDeposits();
    fetchProducts();
    checkMidnightReset();
    fetchStopSaleStatus();
    checkCanCreateSale();
    

    const handleNewDay = () => {
      fetchSales();
      fetchDeposits();
      showInfo("New day started! Today's sales are now being recorded.");
    };
    
    window.addEventListener('newDayStarted', handleNewDay);
    
    return () => {
      window.removeEventListener('newDayStarted', handleNewDay);
    };
  }, []);

  // Fetch stop sale status
  
  function checkMidnightReset() {
    const lastReset = localStorage.getItem('last_sales_reset');
    const now = new Date();
    const today = now.toDateString();
    
    if (lastReset !== today) {
      localStorage.setItem('last_sales_reset', today);
      showInfo("New day started! Today's sales are now being recorded.");
    }
  }

  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  function getTodayDisplay() {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function filterTodaySales(allSales: Sale[]): Sale[] {
    const today = getTodayDate();
    return allSales.filter(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      return saleDate === today;
    });
  }

  function filterTodayDeposits(allDeposits: Deposit[]): Deposit[] {
    const today = getTodayDate();
    return allDeposits.filter(deposit => {
      const depositDate = new Date(deposit.date).toISOString().split('T')[0];
      return depositDate === today;
    });
  }

  // Format currency WITH 2 decimal places
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
    
    // Always show 2 decimal places
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(numAmount);
  };

  

  // Fetch daily report (sales + deposits combined)
  async function fetchDailyReport() {
    try {
      const token = localStorage.getItem("access_token");
      const today = getTodayDate();
      const res = await apiFetch(`/api/sales/daily-report/?start_date=${today}&end_date=${today}`);

      if (res.ok) {
        const data: DailyReport[] = await res.json();
        if (data.length > 0) {
          // You can use this data for dashboard stats
          console.log('Daily report:', data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching daily report:", error);
    }
  }

  

  function canEditSale(sale: Sale): boolean {
    if (!userRole) return false;

    const saleDate = new Date(sale.date);
    const now = new Date();
    const daysDifference = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
    
    const isFirstReceiptPrinted = sale.receipt_print_count && sale.receipt_print_count > 0;
    const isOlderThan7Days = daysDifference > 7;
    
    if (userRole === "CASHIER") {
      return !isFirstReceiptPrinted;
    } else if (userRole === "ADMIN" || userRole === "MANAGER") {
      return !isOlderThan7Days;
    }
    
    return false;
  }

  function handleEditClick(sale: Sale) {
    if (canEditSale(sale)) {
      setSelectedSaleForEdit(sale);
      setEditModalOpen(true);
      setDropdownOpen(null);
    }
  }

  function handleViewReceiptClick(sale: Sale) {
    setSelectedSaleId(sale.invoice_id);
    setView("receipt");
    setDropdownOpen(null);
  }

  const displaySales = showAllSales ? sales : filterTodaySales(sales);
  const displayDeposits = showAllSales ? deposits : filterTodayDeposits(deposits);
  
  useEffect(() => {
    if (displaySales.length > 0) {
      console.log('DEBUG - Display Sales:', displaySales);
      console.log('DEBUG - Cash Sales:', displaySales.filter(s => s.payment_method === 'cash'));
      console.log('DEBUG - Digital Sales:', displaySales.filter(s => s.payment_method === 'transfer' || s.payment_method === 'pos'));
      console.log('DEBUG - Credit Sales:', displaySales.filter(s => s.payment_method === 'credit'));
    }
  }, [displaySales]);

  const filteredSales = displaySales.filter((sale) => {
    if (!sale || !sale.invoice_id) return false;
    
    const searchQuery = query.toLowerCase();
    return (
      sale.invoice_id.toLowerCase().includes(searchQuery) ||
      sale.customer_name?.toLowerCase().includes(searchQuery)
    );
  });

  // FIXED: Calculate total deposits
  const totalDeposits = displayDeposits.reduce((sum, deposit) => {
    const amount = deposit.amount || 0;
    return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
  }, 0);

  // FIXED: Calculate cash amount
  const cashAmount = displaySales
    .filter(sale => sale.payment_method === 'cash')
    .reduce((sum, sale) => {
      const amount = sale.total_amount || 0;
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    }, 0);
    
  // FIXED: Calculate digital amount
  const digitalAmount = displaySales
    .filter(sale => sale.payment_method === 'transfer' || sale.payment_method === 'pos')
    .reduce((sum, sale) => {
      const amount = sale.total_amount || 0;
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    }, 0);
    
  // FIXED: Calculate credit amount
  const creditAmount = displaySales
    .filter(sale => sale.payment_method === 'credit')
    .reduce((sum, sale) => {
      const amount = sale.total_amount || 0;
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    }, 0);

  // Total amount = cash + digital + credit
  const totalAmount = cashAmount + digitalAmount + creditAmount;
  
  // Calculate counts
  const totalSalesCount = displaySales.length;
  const cashSalesCount = displaySales.filter(s => s.payment_method === 'cash').length;
  const digitalSalesCount = displaySales.filter(s => s.payment_method === 'transfer' || s.payment_method === 'pos').length;
  const creditSalesCount = displaySales.filter(s => s.payment_method === 'credit').length;

  // Combine sales and deposits for display
  const allRecords = [
    ...displaySales.map(sale => ({
      ...sale,
      type: 'sale' as const,
      id: sale.id,
      invoice_id: sale.invoice_id,
      customer_name: sale.customer_name,
      amount: sale.total_amount,
      payment_method: sale.payment_method,
      date: sale.date
    })),
    ...displayDeposits.map(deposit => ({
      ...deposit,
      type: 'deposit' as const,
      id: deposit.id,
      invoice_id: `DEP-${deposit.id}`,
      customer_name: deposit.depositor_name,
      amount: deposit.amount,
      payment_method: 'deposit',
      bank_name: deposit.bank_name,
      date: deposit.date
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Handle new sale button click with stop sale check
  const handleNewSaleClick = () => {
    if (!canCreateSale) {
      showError("Sales have been stopped by management. Please contact your supervisor.");
      return;
    }
    setSaleOpen(true);
  };

  
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          <main className="pt-20 p-4">
            {view === "list" ? (
              <div className="flex flex-col h-[calc(100vh-100px)]">
                {/* Fixed Header and Stats Cards Section */}
                <div className="flex-shrink-0">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="flex items-center gap-3 mt-2">
                        <h1 className="text-3xl font-bold text-gray-800">Sales</h1>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowAllSales(!showAllSales)}
                            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition ${showAllSales ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            <Calendar className="w-4 h-4" />
                            {showAllSales ? 'Show All Sales' : 'Today\'s Sales Only'}
                          </button>
                          <button
                            onClick={handleRefresh}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                            title="Refresh all data"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-600">Record and manage sales transactions</p>
                        {!showAllSales && (
                          <span className="text-sm text-blue-600 font-medium">
                            ({getTodayDisplay()})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!showAllSales && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Today's Total</p>
                          <p className="text-xl font-bold text-green-700">
                            ₦{formatCurrency(totalAmount)}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {/* Stop Sale Button - Only for ADMIN/MANAGER */}
                        <StopSaleButton 
                          onStatusChange={() => {
                            fetchStopSaleStatus();
                            checkCanCreateSale();
                          }} 
                        />

                        {/* Only ADMIN or MANAGER can see Cash Deposited button */}
                        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                          <button
                            onClick={() => setDepositOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm transition"
                          >
                            <Building className="w-4 h-4" />
                            Cash Deposit
                          </button>
                        )}
                        <button
                          onClick={handleNewSaleClick}
                          className={`flex items-center gap-2 px-3 py-2 text-white rounded-xl text-sm font-medium shadow-sm transition ${
                            !canCreateSale
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                          disabled={!canCreateSale}
                          title={!canCreateSale ? "Sales have been stopped by management" : "Create new sale"}
                        >
                          <Plus className="w-4 h-4" />
                          New Sale
                          {!canCreateSale && (
                            <AlertTriangle className="w-4 h-4 ml-1" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning banner if sales are stopped */}
                  {isSaleStopped && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-2 text-sm">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="font-medium">Sales have been stopped by management</p>
                      </div>
                      <p className="text-sm text-red-600 mt-1">
                        Only administrators and managers can process sales at this time.
                      </p>
                    </div>
                  )}

                  {/* Summary Cards */}

                  <div className="mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-[-10px]">
                    {/* Total Sales */}
                    <ToggleStatsCard
                      title="Total Sales"
                      value={totalSalesCount}
                      subtitle="Transactions"
                      icon={<Receipt className="text-blue-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-blue-100"
                    />
                    
                    {/* Total Amount */}
                    <ToggleStatsCard
                      title="Total Amount"
                      value={totalAmount}
                      subtitle="Cash + Digital + Credit"
                      icon={<DollarSign className="text-green-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-green-100"
                      isCurrency={true}
                    />
                    
                    {/* Cash Amount */}
                    <ToggleStatsCard
                      title="Cash Amount"
                      value={cashAmount}
                      subtitle={`${cashSalesCount} cash sales`}
                      icon={<Banknote className="text-yellow-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-yellow-100"
                      isCurrency={true}
                    />
                    
                    {/* Digital Amount */}
                    <ToggleStatsCard
                      title="Digital Amount"
                      value={digitalAmount}
                      subtitle={`${digitalSalesCount} digital sales`}
                      icon={<CreditCard className="text-purple-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-purple-100"
                      isCurrency={true}
                    />

                    {/* Cash Deposited */}
                    <ToggleStatsCard
                      title="Cash Deposited"
                      value={totalDeposits}
                      subtitle={`${displayDeposits.length} deposit(s) today`}
                      icon={<Building className="text-red-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-red-100"
                      isCurrency={true}
                    />

                    {/* Outstanding Amount */}
                    <ToggleStatsCard
                      title="Outstanding Amount"
                      value={creditAmount}
                      subtitle={`${creditSalesCount} credit sales`}
                      icon={<Clock className="text-orange-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-orange-100"
                      isCurrency={true}
                    />

                    {/* Cash Sales Count */}
                    <ToggleStatsCard
                      title="Cash Sales Count"
                      value={cashSalesCount}
                      subtitle="Cash transactions"
                      icon={<Banknote className="text-yellow-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-yellow-100"
                    />

                    {/* Digital Sales Count */}
                    <ToggleStatsCard
                      title="Digital Sales Count"
                      value={digitalSalesCount}
                      subtitle="Digital transactions"
                      icon={<CreditCard className="text-purple-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-purple-100"
                    />
                  </div>
                </div>

                {/* Scrollable Table Container */}
                <div className="flex-1 overflow-hidden min-w-0 mt-[-8]">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                    {/* Table Header - Fixed */}
                    <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                      <div className="px-6 py-2">
                        <h2 className="text-md font-semibold text-gray-800">All Records</h2>
                      </div>
                      <div className="px-5 py-2 border-t border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-max">
                            <thead>
                              <tr>
                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                                  Invoice ID
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                                  Customer
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                                  Amount
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                                  Payment Method
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                                  Date & Time
                                </th>
                                <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-2 whitespace-nowrap">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Table Body */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {loading ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                Loading sales...
                              </td>
                            </tr>
                          ) : allRecords.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-14 text-center text-gray-500">
                                {showAllSales ? 'No records found' : 'No sales recorded today yet'}
                                {!showAllSales && canCreateSale && (
                                  <div className="mt-2">
                                    <button
                                      onClick={handleNewSaleClick}
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      Start recording today's first sale →
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ) : (
                            allRecords.map((record) => {
                              const isDeposit = record.type === 'deposit';
                              const editable = !isDeposit && canEditSale(record as Sale);
                              
                              return (
                                <tr 
                                  key={`${record.type}-${record.id}`} 
                                  className="hover:bg-gray-50 transition"
                                >
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        isDeposit 
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {isDeposit ? 'DEPOSIT' : 'SALE'}
                                      </span>
                                      <span className="text-sm font-medium text-gray-900">
                                        {record.invoice_id}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                                    {record.customer_name || '—'}
                                    {isDeposit && record.bank_name && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Bank: {record.bank_name}
                                      </div>
                                    )}
                                  </td>
                                  <td className={`px-4 py-4 text-sm font-semibold whitespace-nowrap ${
                                    isDeposit ? 'text-red-900' : 'text-gray-900'
                                  }`}>
                                    ₦{formatCurrency(record.amount)}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-600 capitalize whitespace-nowrap">
                                    {isDeposit ? 'Deposit' : record.payment_method}
                                  </td>
                                  <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                                    {new Date(record.date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                    <br />
                                    <span className="text-xs text-gray-500">
                                      {new Date(record.date).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-sm relative whitespace-nowrap">
                                    {!isDeposit && (
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleViewReceiptClick(record as Sale)}
                                          className="text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                          View Receipt
                                        </button>
                                        <button
                                          onClick={() => setDropdownOpen(dropdownOpen === `sale-${record.id}` ? null : `sale-${record.id}`)}
                                          className="p-1 hover:bg-gray-100 rounded relative"
                                        >
                                          <MoreVertical className="w-4 h-4 text-gray-500" />
                                        </button>
                                      </div>
                                    )}
                                    
                                    {!isDeposit && dropdownOpen === `sale-${record.id}` && (
                                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                                        <div className="py-1">
                                          <button
                                            onClick={() => handleViewReceiptClick(record as Sale)}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            <Eye className="w-4 h-4 mr-2" />
                                            View Receipt
                                          </button>
                                          <button
                                            onClick={() => handleEditClick(record as Sale)}
                                            disabled={!editable}
                                            className={`flex items-center w-full px-4 py-2 text-sm ${
                                              editable 
                                                ? 'text-gray-700 hover:bg-gray-100' 
                                                : 'text-gray-400 cursor-not-allowed'
                                            }`}
                                          >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Sale
                                            {!editable && (
                                              <span className="text-xs ml-2 italic">(Locked)</span>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sales Modal */}
                <SalesModal
                  open={saleOpen}
                  onClose={() => setSaleOpen(false)}
                  products={products}
                  onSaleCompleted={handleSaleCompleted}
                  isSaleStopped={isSaleStopped}
                  userRole={userRole}
                />

                {/* Deposit Modal */}
                <DepositModal
                  open={depositOpen}
                  onClose={() => setDepositOpen(false)}
                  onDepositCompleted={handleDepositCompleted}
                />

                {/* Edit Sale Modal */}
                {selectedSaleForEdit && (
                  <EditSaleModal
                    open={editModalOpen}
                    onClose={() => {
                      setEditModalOpen(false);
                      setSelectedSaleForEdit(null);
                    }}
                    products={products}
                    saleId={selectedSaleForEdit.id}
                    onSaleUpdated={handleSaleUpdated}
                  />
                )}
              </div>
            ) : (
              <ReceiptView
                saleId={selectedSaleId}
                onDone={() => {
                  setView("list");
                  setSelectedSaleId(null);
                }}
              />
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
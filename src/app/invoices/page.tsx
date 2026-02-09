// src/app/invoices/page.tsx
"use client";
import { useEffect, useState } from "react";
import { ChevronRight, Calendar, Receipt, DollarSign, FileText, Edit, Printer, MoreVertical, Eye } from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import ReceiptView from "../components/salesComponent/ReceiptView";
import EditSaleModal from "../components/salesComponent/EditSaleModal";
import { Sale, Product, UserRole, Deposit } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/services/api";


type DailySales = {
  date: string;
  sales: Sale[];
  totalAmount: number;
  salesCount: number;
  deposits: any[];
  totalDeposits: number;
  depositsCount: number;
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "detail" | "receipt">("list");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);


  const userRole = user?.role as UserRole | null;

  useEffect(() => {
    fetchAllData();
    fetchProducts();
  }, []);

  // Fetch all data
  async function fetchAllData() {
    setLoading(true);
    try {
      await fetchSales();
      await fetchDeposits();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSales() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await apiFetch('/api/sales/');

      if (res.ok) {
        const data: Sale[] = await res.json();
        setSales(data);
      } else {
        console.error("API Error:", await res.text());
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  }

  // Add fetchDeposits function
  async function fetchDeposits() {
    try {
      const res = await fetch('/api/sales/deposits/');

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
      const token = localStorage.getItem("access_token");
      const res = await fetch('/api/inventory/');

      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  useEffect(() => {
    if (sales.length > 0 || deposits.length > 0) {
      groupSalesByDate(sales);
    }
  }, [sales, deposits]);

  function groupSalesByDate(sales: Sale[]) {
    console.log('Grouping sales:', sales.length, 'Deposits:', deposits.length);
    const combinedRecords = [
    ...sales,
    ...deposits.map(deposit => ({
      ...deposit,
      id: deposit.id,
      invoice_id: `DEP-${deposit.id}`,
      customer_name: deposit.depositor_name,
      total_amount: deposit.amount,
      payment_method: 'deposit',
      date: deposit.date,
      type: 'deposit' as const,
      bank_name: deposit.bank_name,
      amount: deposit.amount
    }))
  ];
  console.log('Combined records:', combinedRecords.length);

  const grouped = combinedRecords.reduce((acc, record) => {
    const date = new Date(record.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (!acc[date]) {
      acc[date] = {
        date,
        sales: [],
        deposits: [], // Add separate deposits array
        totalAmount: 0,
        totalDeposits: 0, // Add total deposits
        salesCount: 0,
        depositsCount: 0 // Add deposits count
      };
    }

      let totalAmount = 0;
      if (typeof record.total_amount === 'number') {
        totalAmount = record.total_amount;
      } else if (typeof record.total_amount === 'string') {
        totalAmount = parseFloat(record.total_amount) || 0;
      }

      // Check if it's a deposit
      if ( record.payment_method === 'deposit') {
        acc[date].deposits.push(record);
        acc[date].totalDeposits += totalAmount;
        acc[date].depositsCount += 1;
      } else {
        acc[date].sales.push(record as Sale);
        acc[date].totalAmount += totalAmount;
        acc[date].salesCount += 1;
      }
      return acc;
    }, {} as Record<string, DailySales>);

    const sortedDailySales = Object.values(grouped).sort((a, b) => 
    new Date(b.sales[0]?.date || b.deposits[0]?.date).getTime() - 
    new Date(a.sales[0]?.date || a.deposits[0]?.date).getTime()
  );

    setDailySales(sortedDailySales);
  }

  const calculatePaymentTotals = (sales: Sale[]) => {
    return sales.reduce((acc, sale) => {
      const amount = parseFloat(sale.total_amount.toString()) || 0;
      
      if (sale.payment_method === 'cash') {
        acc.cash += amount;
        acc.cashCount += 1;
      } else if (sale.payment_method === 'transfer') {
        acc.transfer += amount;
        acc.transferCount += 1;
      } else if (sale.payment_method === 'pos') {
        acc.pos += amount;
        acc.posCount += 1;
      } else if (sale.payment_method === 'credit') {
        acc.credit += amount;
        acc.creditCount += 1;
      }
      
      acc.total += amount;
      return acc;
    }, {
      cash: 0,
      cashCount: 0,
      transfer: 0,
      transferCount: 0,
      pos: 0,
      posCount: 0,
      credit: 0,
      creditCount: 0,
      total: 0
    });
  };


  function canEditSale(sale: Sale): boolean {
    if (!userRole) return false;

    const saleDate = new Date(sale.date);
    const now = new Date();
    const daysDifference = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
    
    // Check if first receipt has been printed
    const isFirstReceiptPrinted = sale.receipt_print_count && sale.receipt_print_count > 0;
    
    // Check if sale is older than 7 days
    const isOlderThan7Days = daysDifference > 7;
    
    if (userRole === "CASHIER") {
      // Cashier can only edit if first receipt hasn't been printed
      return !isFirstReceiptPrinted;
    } else if (userRole === "ADMIN" || userRole === "MANAGER") {
      // Admin/Manager can edit even after printing, but not after 7 days
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

  function handleSaleUpdated() {
    fetchSales();
    fetchProducts();
    setEditModalOpen(false);
    setSelectedSaleForEdit(null);
  }

  const selectedDailySale = dailySales.find(d => d.date === selectedDate);
  const paymentTotals = selectedDailySale ? calculatePaymentTotals(selectedDailySale.sales) : null;

  const filteredDailySales = dailySales.filter(daily =>
    daily.date.toLowerCase().includes(query.toLowerCase())
  );

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
    
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount).replace('NGN', '₦').trim();
  };

  

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          {/* ✅ FIXED: Main content with proper scrolling */}
          <main className="pt-20 h-screen overflow-hidden flex flex-col">
            {view === "list" && (
              <>
                {/* ✅ Fixed Header Section */}
                <div className="flex-shrink-0 p-6 space-y-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">Daily Sales Invoices</h1>
                    <p className="text-gray-600 mt-1">View all sales organized by date</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Days</p>
                          <p className="text-2xl font-bold text-gray-900">{dailySales.length}</p>
                        </div>
                        <Calendar className="w-10 h-10 text-blue-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {dailySales.reduce((sum, d) => sum + d.salesCount, 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {dailySales.reduce((sum, d) => sum + d.depositsCount, 0)} deposits
                          </p>
                        </div>
                        <Receipt className="w-10 h-10 text-green-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Revenue + Deposits</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(dailySales.reduce((sum, d) => {
                              const salesAmount = d.totalAmount || 0;
                              const depositsAmount = d.totalDeposits || 0;
                              return sum + (isNaN(salesAmount) ? 0 : salesAmount) + (isNaN(depositsAmount) ? 0 : depositsAmount);
                            }, 0))}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Sales: {formatCurrency(dailySales.reduce((sum, d) => sum + (d.totalAmount || 0), 0))} 
                            {' + '}
                            Deposits: {formatCurrency(dailySales.reduce((sum, d) => sum + (d.totalDeposits || 0), 0))}
                          </p>
                        </div>
                        <DollarSign className="w-10 h-10 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Scrollable Daily Sales List */}
                <div className="flex-1 px-6 pb-6 overflow-y-auto">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                      <div className="p-12 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        Loading invoices...
                      </div>
                    ) : filteredDailySales.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p>No sales found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {filteredDailySales.map((daily) => (
                          <button
                            key={daily.date}
                            onClick={() => {
                              setSelectedDate(daily.date);
                              setView("detail");
                            }}
                            className="w-full px-6 py-2 hover:bg-gray-50 transition flex items-center justify-between group"
                          >
                            <div className="flex items-center mt-4 mb-4 gap-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-8 h-8 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <h3 className="font-semibold text-gray-900">{daily.date}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {daily.salesCount} sales
                                  </span>
                                  {daily.depositsCount > 0 && (
                                    <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                                      {daily.depositsCount} deposits
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(daily.totalAmount)}
                                </p>
                                <p className="text-sm text-gray-600">Total Sales</p>
                                {daily.totalDeposits > 0 && (
                                  <>
                                    <p className="font-semibold text-red-700 mt-1">
                                      {formatCurrency(daily.totalDeposits)}
                                    </p>
                                    <p className="text-sm text-red-600">Total Deposits</p>
                                  </>
                                )}
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {view === "detail" && selectedDailySale && (
              <div>
                <div className="mb-6 mt-8">
                  <button
                    onClick={() => {
                      setView("list");
                      setSelectedDate(null);
                    }}
                    className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
                  >
                    ← Back to Invoice List
                  </button>
                  <h1 className="text-3xl font-bold text-gray-800">{selectedDate}</h1>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                      <p className="text-sm text-gray-600">Total Sales: {selectedDailySale.salesCount}</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(selectedDailySale.totalAmount)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{selectedDailySale.salesCount} transactions</p>
                    </div>

                    {/* ✅ CASH SALES */}
                    {paymentTotals && paymentTotals.cashCount > 0 && (
                      <div className="px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-green-600 font-medium">Cash Sales</p>
                        </div>
                        <p className="text-lg font-semibold text-green-700">
                          {formatCurrency(paymentTotals.cash)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {paymentTotals.cashCount} {paymentTotals.cashCount === 1 ? 'transaction' : 'transactions'}
                        </p>
                      </div>
                    )}
                    
                    {/* ✅ TRANSFER SALES */}
                    {paymentTotals && paymentTotals.transferCount > 0 && (
                      <div className=" px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-blue-600 font-medium">Transfer Sales</p>
                        </div>
                        <p className="text-lg font-semibold text-blue-700">
                          {formatCurrency(paymentTotals.transfer)}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {paymentTotals.transferCount} {paymentTotals.transferCount === 1 ? 'transaction' : 'transactions'}
                        </p>
                      </div>
                    )}
                    
                    {/* ✅ POS SALES */}
                    {paymentTotals && paymentTotals.posCount > 0 && (
                      <div className=" px-3 py-2 ">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-purple-600 font-medium">POS Sales</p>
                        </div>
                        <p className="text-lg font-semibold text-purple-700">
                          {formatCurrency(paymentTotals.pos)}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          {paymentTotals.posCount} {paymentTotals.posCount === 1 ? 'transaction' : 'transactions'}
                        </p>
                      </div>
                    )}
                    
                    {/* ✅ CREDIT SALES */}
                    {paymentTotals && paymentTotals.creditCount > 0 && (
                      <div className="px-3 py-2 ">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-orange-600 font-medium">Credit Sales</p>
                        </div>
                        <p className="text-lg font-semibold text-orange-700">
                          {formatCurrency(paymentTotals.credit)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {paymentTotals.creditCount} {paymentTotals.creditCount === 1 ? 'transaction' : 'transactions'}
                        </p>
                      </div>
                    )}

                    {selectedDailySale.depositsCount > 0 && (
                      <div className="px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm text-red-600 font-medium">Cash Deposits</p>
                        </div>
                        <p className="text-lg font-semibold text-red-700">
                          {formatCurrency(selectedDailySale.totalDeposits)}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {selectedDailySale.depositsCount} {selectedDailySale.depositsCount === 1 ? 'deposit' : 'deposits'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sales Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 h-[400px]">
                  <div className="flex flex-col h-full">
                    {/* Fixed Header */}
                    <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Invoice ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Payment Method</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                          </tr>
                        </thead>
                      </table>
                    </div>
                    
                    {/* Scrollable Body */}
                    <div className="flex-1 px-6 pb-6 overflow-y-auto space-y-6 scrollbar-thin">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-200">
                          {selectedDailySale.sales.map((sale) => {
                            const editable = canEditSale(sale);
                            return (
                              <tr key={sale.id} className="hover:bg-gray-50 transition relative">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mr-2">
                                    SALE
                                  </span>
                                  {sale.invoice_id}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{sale.customer_name || '—'}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  {formatCurrency(sale.total_amount)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 capitalize">{sale.payment_method}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {new Date(sale.date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-6 py-4 text-sm relative">
                                  <div className="relative">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleViewReceiptClick(sale)}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        View Receipt
                                      </button>
                                      <button
                                        onClick={() => setDropdownOpen(dropdownOpen === sale.id.toString() ? null : sale.id.toString())}
                                        className="p-1 hover:bg-gray-100 rounded relative z-10"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-500" />
                                      </button>
                                    </div>
                                    
                                    {dropdownOpen === sale.id.toString() && (
                                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                                        <div className="py-2">
                                          <button
                                            onClick={() => handleViewReceiptClick(sale)}
                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                          >
                                            <Eye className="w-4 h-4 mr-3 text-blue-500" />
                                            <div className="text-left">
                                              <div className="font-medium">View Receipt</div>
                                              <div className="text-xs text-gray-500">View sale receipt</div>
                                            </div>
                                          </button>
                                          <button
                                            onClick={() => handleEditClick(sale)}
                                            disabled={!editable}
                                            className={`flex items-center w-full px-4 py-3 text-sm ${
                                              editable 
                                                ? 'text-gray-700 hover:bg-gray-50 hover:text-gray-900' 
                                                : 'text-gray-400 cursor-not-allowed'
                                            } transition-colors`}
                                          >
                                            <Edit className="w-4 h-4 mr-3 text-orange-500" />
                                            <div className="text-left">
                                              <div className="font-medium">Edit Sale</div>
                                              <div className="text-xs text-gray-500">
                                                {editable ? 'Modify sale details' : 'Not editable'}
                                              </div>
                                            </div>
                                          </button>
                                        </div>
                                        
                                        {/* Dropdown arrow */}
                                        <div 
                                          className="absolute -top-2 right-4 w-4 h-4 bg-white transform rotate-45 border-t border-l border-gray-200"
                                          style={{ 
                                            boxShadow: '-1px -1px 1px rgba(0,0,0,0.05)'
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {/* Deposits Table */}
                {selectedDailySale.depositsCount > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[300px]">
                    <div className="flex flex-col h-full">
                      {/* Fixed Header */}
                      <div className="flex-shrink-0 bg-red-50 border-b border-gray-200">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-red-800 uppercase">Deposit ID</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-red-800 uppercase">Depositor</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-red-800 uppercase">Bank</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-red-800 uppercase">Amount</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-red-800 uppercase">Time</th>
                            </tr>
                          </thead>
                        </table>
                      </div>
                      
                      {/* Scrollable Body */}
                      <div className="flex-1 overflow-y-auto scrollbar-thin">
                        <table className="w-full">
                          <tbody className="divide-y divide-gray-200">
                            {selectedDailySale.deposits.map((deposit) => (
                              <tr key={deposit.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 mr-2">
                                    DEPOSIT
                                  </span>
                                  DEP-{deposit.id}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{deposit.depositor_name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{deposit.bank_name}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-red-700">
                                  {formatCurrency(deposit.amount)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {new Date(deposit.date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === "receipt" && (
              <ReceiptView
                saleId={selectedSaleId}
                onDone={() => {
                  setView("detail");
                  setSelectedSaleId(null);
                }}
              />
            )}
          </main>
        </div>
      </div>

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
    </ProtectedRoute>
  );
}
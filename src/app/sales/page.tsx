// src/app/sales/page.tsx 
"use client";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import SalesModal from "../components/salesComponent/SaleModal";
import ReceiptView from "../components/salesComponent/ReceiptView";
import EditSaleModal from "../components/salesComponent/EditSaleModal";
import DepositModal from "../components/salesComponent/DepositModal";
import UnsuppliedModal from "../components/salesComponent/UnsuppliedModal";
import StopSaleButton from "../components/salesComponent/StopSaleButton";
import ToggleStatsCard from "../components/shared/ToggleStatsCard";
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
  AlertTriangle,
  PackageX,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showInfo, showError } from "@/app/utils/toast";
import {
  useSales,
  useDeposits,
  useProducts,
  useUnsupplied,
  useStopSaleStatus,
  useCanCreateSale,
  useMarkSupplied,
  queryKeys,
} from "@/hooks/useSalesQueries";

export default function SalesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [saleOpen, setSaleOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [unsuppliedOpen, setUnsuppliedOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "receipt">("list");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [showAllSales, setShowAllSales] = useState(false);
  const [activeTab, setActiveTab] = useState<"sales" | "unsupplied">("sales");

  const userRole = user?.role as UserRole | null;

  // ─── React Query hooks ────────────────────────────────────────────────────
  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useSales();
  const { data: deposits = [], refetch: refetchDeposits } = useDeposits();
  const { data: products = [] } = useProducts();
  const { data: unsuppliedData = [], refetch: refetchUnsupplied } = useUnsupplied();
  const { data: stopSaleData } = useStopSaleStatus();
  const { data: canCreateData } = useCanCreateSale();
  const markSuppliedMutation = useMarkSupplied();

  const isSaleStopped = stopSaleData?.is_sale_stopped ?? false;
  const canCreateSale = canCreateData?.can_create_sale ?? true;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const getTodayDisplay = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const filterToday = <T extends { date: string }>(list: T[]): T[] => {
    const today = getTodayDate();
    return list.filter((item) => new Date(item.date).toISOString().split("T")[0] === today);
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const n =
      typeof amount === "number" ? amount : parseFloat(amount as string) || 0;
    return new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(isNaN(n) ? 0 : n);
  };

  // ─── Displayed data based on tab/toggle ───────────────────────────────────
  const displaySales: Sale[] = showAllSales ? sales : filterToday(sales);
  const displayDeposits: Deposit[] = showAllSales ? deposits : filterToday(deposits);
  const displayUnsupplied = showAllSales ? unsuppliedData : filterToday(unsuppliedData);

  const filteredSales = displaySales.filter((sale) => {
    if (!sale?.invoice_id) return false;
    const q = query.toLowerCase();
    return (
      sale.invoice_id.toLowerCase().includes(q) ||
      sale.customer_name?.toLowerCase().includes(q)
    );
  });

  // ─── Totals ───────────────────────────────────────────────────────────────
  const sum = (list: any[], key = "total_amount") =>
    list.reduce((acc, item) => {
      const v = item[key] ?? 0;
      return acc + (typeof v === "number" ? v : parseFloat(v) || 0);
    }, 0);

  const cashSales = displaySales.filter((s) => s.payment_method === "cash");
  const digitalSales = displaySales.filter((s) =>
    ["transfer", "pos"].includes(s.payment_method)
  );
  const creditSales = displaySales.filter((s) => s.payment_method === "credit");
  const cashAmount = sum(cashSales);
  const digitalAmount = sum(digitalSales);
  const creditAmount = sum(creditSales);
  const totalAmount = cashAmount + digitalAmount + creditAmount;
  const totalDeposits = sum(displayDeposits, "amount");

  const pendingUnsupplied = displayUnsupplied.filter((u: any) => u.status === "pending");
  const pendingUnsuppliedCount = pendingUnsupplied.length;

  // ─── All records combined (for the table) ─────────────────────────────────
  const allRecords = [
    ...displaySales.map((s) => ({ ...s, _type: "sale" as const })),
    ...displayDeposits.map((d) => ({
      ...d,
      _type: "deposit" as const,
      invoice_id: `DEP-${d.id}`,
      customer_name: d.depositor_name,
      amount: d.amount,
      payment_method: "deposit",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ─── Edit/receipt helpers ─────────────────────────────────────────────────
  function canEditSale(sale: Sale): boolean {
    if (!userRole) return false;
    const days =
      (Date.now() - new Date(sale.date).getTime()) / (1000 * 3600 * 24);
    if (userRole === "CASHIER") return !sale.receipt_print_count || sale.receipt_print_count < 1;
    if (userRole === "ADMIN" || userRole === "MANAGER") return days <= 7;
    return false;
  }

  function handleViewReceiptClick(sale: Sale) {
    setSelectedSaleId(sale.invoice_id);
    setView("receipt");
    setDropdownOpen(null);
  }

  function handleEditClick(sale: Sale) {
    if (canEditSale(sale)) {
      setSelectedSaleForEdit(sale);
      setEditModalOpen(true);
      setDropdownOpen(null);
    }
  }

  // ─── Mutations / callbacks ────────────────────────────────────────────────
  async function handleSaleCompleted(sale: any) {
    setSelectedSaleId(sale.invoice_id || sale.id);
    setView("receipt");
    queryClient.invalidateQueries({ queryKey: queryKeys.sales });
    queryClient.invalidateQueries({ queryKey: queryKeys.products });
  }

  function handleDepositCompleted() {
    queryClient.invalidateQueries({ queryKey: queryKeys.deposits });
  }

  function handleUnsuppliedCreated() {
    queryClient.invalidateQueries({ queryKey: queryKeys.unsupplied });
  }

  function handleSaleUpdated() {
    queryClient.invalidateQueries({ queryKey: queryKeys.sales });
    queryClient.invalidateQueries({ queryKey: queryKeys.products });
    setEditModalOpen(false);
    setSelectedSaleForEdit(null);
  }

  async function handleMarkSupplied(id: number) {
    try {
      await markSuppliedMutation.mutateAsync(id);
      showSuccess("Marked as supplied!");
    } catch (err: any) {
      showError(err.message || "Failed to mark as supplied");
    }
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchSales(),
      refetchDeposits(),
      refetchUnsupplied(),
    ]);
    showInfo("Data refreshed!");
  }, [refetchSales, refetchDeposits, refetchUnsupplied]);

  const handleStopSaleStatusChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.stopSaleStatus });
    queryClient.invalidateQueries({ queryKey: queryKeys.canCreateSale });
  };

  const handleNewSaleClick = () => {
    if (!canCreateSale) {
      showError("Sales have been stopped by management.");
      return;
    }
    setSaleOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />
          <main className="pt-20 p-4">
            {view === "list" ? (
              <div className="flex flex-col h-[calc(100vh-100px)]">
                {/* ── Header ── */}
                <div className="flex-shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="flex items-center gap-3 mt-2">
                        <h1 className="text-3xl font-bold text-gray-800">Sales</h1>
                        <button
                          onClick={() => setShowAllSales(!showAllSales)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition ${
                            showAllSales
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          {showAllSales ? "All Sales" : "Today Only"}
                        </button>
                        <button
                          onClick={handleRefresh}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                          title="Refresh"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-500 text-sm mt-1">
                        {!showAllSales && getTodayDisplay()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!showAllSales && (
                        <div className="text-right mr-2">
                          <p className="text-xs text-gray-500">Today's Total</p>
                          <p className="text-xl font-bold text-green-700">
                            ₦{formatCurrency(totalAmount)}
                          </p>
                        </div>
                      )}
                      <StopSaleButton onStatusChange={handleStopSaleStatusChange} />
                      {(userRole === "ADMIN" || userRole === "MANAGER") && (
                        <button
                          onClick={() => setDepositOpen(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm transition"
                        >
                          <Building className="w-4 h-4" />
                          Cash Deposit
                        </button>
                      )}
                      <button
                        onClick={() => setUnsuppliedOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 text-sm font-medium shadow-sm transition"
                      >
                        <PackageX className="w-4 h-4" />
                        Unsupplied
                        {pendingUnsuppliedCount > 0 && (
                          <span className="bg-white text-amber-600 text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                            {pendingUnsuppliedCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={handleNewSaleClick}
                        disabled={!canCreateSale}
                        className={`flex items-center gap-2 px-3 py-2 text-white rounded-xl text-sm font-medium shadow-sm transition ${
                          !canCreateSale
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        New Sale
                        {!canCreateSale && <AlertTriangle className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Stop sale banner */}
                  {isSaleStopped && (
                    <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2 text-sm flex items-center gap-2 text-red-800">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <p className="font-medium">
                        Sales stopped by management. Only admins/managers can process sales.
                      </p>
                    </div>
                  )}

                  {/* ── Stats Cards ── */}
                  <div className="mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    <ToggleStatsCard title="Total Sales" value={displaySales.length} subtitle="Transactions" icon={<Receipt className="text-blue-600" size={18} />} color="text-gray-900" bgColor="bg-blue-100" />
                    <ToggleStatsCard title="Total Amount" value={totalAmount} subtitle="All methods" icon={<DollarSign className="text-green-600" size={18} />} color="text-gray-900" bgColor="bg-green-100" isCurrency />
                    <ToggleStatsCard title="Cash" value={cashAmount} subtitle={`${cashSales.length} sales`} icon={<Banknote className="text-yellow-600" size={18} />} color="text-gray-900" bgColor="bg-yellow-100" isCurrency />
                    <ToggleStatsCard title="Digital" value={digitalAmount} subtitle={`${digitalSales.length} sales`} icon={<CreditCard className="text-purple-600" size={18} />} color="text-gray-900" bgColor="bg-purple-100" isCurrency />
                    <ToggleStatsCard title="Credit" value={creditAmount} subtitle={`${creditSales.length} sales`} icon={<Clock className="text-orange-600" size={18} />} color="text-gray-900" bgColor="bg-orange-100" isCurrency />
                    <ToggleStatsCard title="Deposits" value={totalDeposits} subtitle={`${displayDeposits.length} deposit(s)`} icon={<Building className="text-red-600" size={18} />} color="text-gray-900" bgColor="bg-red-100" isCurrency />
                    <ToggleStatsCard title="Unsupplied" value={pendingUnsuppliedCount} subtitle="Pending delivery" icon={<PackageX className="text-amber-600" size={18} />} color="text-gray-900" bgColor="bg-amber-100" />
                    <ToggleStatsCard title="Supplied" value={displayUnsupplied.filter((u: any) => u.status === "supplied").length} subtitle="Delivered" icon={<CheckCircle2 className="text-teal-600" size={18} />} color="text-gray-900" bgColor="bg-teal-100" />
                  </div>

                  {/* ── Tabs ── */}
                  <div className="flex border-b mb-3">
                    <button
                      onClick={() => setActiveTab("sales")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                        activeTab === "sales"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Sales & Deposits
                    </button>
                    <button
                      onClick={() => setActiveTab("unsupplied")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                        activeTab === "unsupplied"
                          ? "border-amber-500 text-amber-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Unsupplied Goods
                      {pendingUnsuppliedCount > 0 && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold rounded-full px-2 py-0.5">
                          {pendingUnsuppliedCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Table Area ── */}
                <div className="flex-1 overflow-hidden min-w-0">
                  {activeTab === "sales" ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                      {/* Fixed header */}
                      <div className="flex-shrink-0 bg-gray-50 border-b">
                        <table className="w-full">
                          <thead>
                            <tr>
                              {["Invoice ID", "Customer", "Amount", "Payment", "Date & Time", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        </table>
                      </div>
                      {/* Scrollable body */}
                      <div className="flex-1 overflow-auto">
                        <table className="w-full">
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {salesLoading ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center text-gray-400">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
                                  Loading...
                                </td>
                              </tr>
                            ) : allRecords.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-14 text-center text-gray-400">
                                  {showAllSales ? "No records found" : "No sales recorded today yet"}
                                </td>
                              </tr>
                            ) : (
                              allRecords.map((record) => {
                                const isDeposit = record._type === "deposit";
                                const editable = !isDeposit && canEditSale(record as Sale);
                                return (
                                  <tr key={`${record._type}-${record.id}`} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${isDeposit ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                                          {isDeposit ? "DEPOSIT" : "SALE"}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">{record.invoice_id}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {record.customer_name || "—"}
                                      {isDeposit && (record as any).bank_name && (
                                        <div className="text-xs text-gray-400">Bank: {(record as any).bank_name}</div>
                                      )}
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-semibold ${isDeposit ? "text-red-700" : "text-gray-900"}`}>
                                      ₦{formatCurrency((record as any).amount ?? (record as any).total_amount)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                      {isDeposit ? "Deposit" : record.payment_method}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                      {new Date(record.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      <br />
                                      <span className="text-xs">{new Date(record.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm relative">
                                      {!isDeposit && (
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => handleViewReceiptClick(record as Sale)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                            View Receipt
                                          </button>
                                          <div className="relative">
                                            <button onClick={() => setDropdownOpen(dropdownOpen === `sale-${record.id}` ? null : `sale-${record.id}`)} className="p-1 hover:bg-gray-100 rounded">
                                              <MoreVertical className="w-4 h-4 text-gray-500" />
                                            </button>
                                            {dropdownOpen === `sale-${record.id}` && (
                                              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-xl z-50 border border-gray-200 py-1">
                                                <button onClick={() => handleViewReceiptClick(record as Sale)} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                                  <Eye className="w-4 h-4 mr-2 text-blue-500" />View Receipt
                                                </button>
                                                <button onClick={() => handleEditClick(record as Sale)} disabled={!editable} className={`flex items-center w-full px-4 py-2 text-sm ${editable ? "text-gray-700 hover:bg-gray-50" : "text-gray-400 cursor-not-allowed"}`}>
                                                  <Edit className="w-4 h-4 mr-2 text-orange-500" />
                                                  Edit Sale{!editable && <span className="text-xs ml-1 italic">(Locked)</span>}
                                                </button>
                                              </div>
                                            )}
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
                  ) : (
                    /* ── Unsupplied Table ── */
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                      <div className="flex-shrink-0 bg-amber-50 border-b">
                        <table className="w-full">
                          <thead>
                            <tr>
                              {["#", "Customer", "Products", "Date", "Status", "Action"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-amber-800 uppercase">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        </table>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <table className="w-full">
                          <tbody className="divide-y divide-gray-100">
                            {displayUnsupplied.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-14 text-center text-gray-400">
                                  No unsupplied records{showAllSales ? "" : " today"}
                                </td>
                              </tr>
                            ) : (
                              displayUnsupplied.map((u: any) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-700">#{u.id}</td>
                                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{u.customer_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <div className="flex flex-wrap gap-1">
                                      {u.items?.map((item: any, i: number) => (
                                        <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                                          {item.product_name} ×{item.quantity}
                                        </span>
                                      ))}
                                    </div>
                                    {u.notes && <p className="text-xs text-gray-400 mt-1 italic">{u.notes}</p>}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-500">
                                    {new Date(u.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    <br />
                                    <span className="text-xs">{new Date(u.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === "supplied" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                                      {u.status === "supplied" ? <CheckCircle2 className="w-3 h-3" /> : <PackageX className="w-3 h-3" />}
                                      {u.status === "supplied" ? "Supplied" : "Pending"}
                                    </span>
                                    {u.status === "supplied" && u.supplied_by_name && (
                                      <div className="text-xs text-gray-400 mt-1">by {u.supplied_by_name}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {u.status === "pending" && (
                                      <button
                                        onClick={() => handleMarkSupplied(u.id)}
                                        disabled={markSuppliedMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Mark Supplied
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
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

      {/* ── Modals ── */}
      <SalesModal open={saleOpen} onClose={() => setSaleOpen(false)} products={products} onSaleCompleted={handleSaleCompleted} isSaleStopped={isSaleStopped} userRole={userRole} />
      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} onDepositCompleted={handleDepositCompleted} />
      <UnsuppliedModal open={unsuppliedOpen} onClose={() => setUnsuppliedOpen(false)} products={products} onUnsuppliedCreated={handleUnsuppliedCreated} />
      {selectedSaleForEdit && (
        <EditSaleModal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedSaleForEdit(null); }} products={products} saleId={selectedSaleForEdit.id} onSaleUpdated={handleSaleUpdated} />
      )}
    </ProtectedRoute>
  );
}
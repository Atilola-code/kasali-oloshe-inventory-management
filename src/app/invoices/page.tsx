// src/app/invoices/page.tsx 
"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Calendar,
  Receipt,
  DollarSign,
  FileText,
  Edit,
  MoreVertical,
  Eye,
  PackageX,
  CheckCircle2,
} from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import ReceiptView from "../components/salesComponent/ReceiptView";
import EditSaleModal from "../components/salesComponent/EditSaleModal";
import { Sale, Product, UserRole, Deposit } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/app/utils/toast";
import {
  useSales,
  useDeposits,
  useProducts,
  useUnsupplied,
  useMarkSupplied,
  queryKeys,
} from "@/hooks/useSalesQueries";

type DailySales = {
  date: string;
  rawDate: Date;
  sales: Sale[];
  deposits: any[];
  unsupplied: any[];
  totalAmount: number;
  salesCount: number;
  totalDeposits: number;
  depositsCount: number;
  pendingUnsupplied: number;
  suppliedCount: number;
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "detail" | "receipt">("list");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  const userRole = user?.role as UserRole | null;

  const { data: sales = [], isLoading } = useSales();
  const { data: deposits = [] } = useDeposits();
  const { data: products = [] } = useProducts();
  const { data: unsuppliedAll = [] } = useUnsupplied();
  const markSuppliedMutation = useMarkSupplied();

  // ─── Group by date ─────────────────────────────────────────────────────────
  const dailySales: DailySales[] = (() => {
    const map: Record<string, DailySales> = {};

    const addEntry = (dateLabel: string, rawDate: Date) => {
      if (!map[dateLabel]) {
        map[dateLabel] = {
          date: dateLabel,
          rawDate,
          sales: [],
          deposits: [],
          unsupplied: [],
          totalAmount: 0,
          salesCount: 0,
          totalDeposits: 0,
          depositsCount: 0,
          pendingUnsupplied: 0,
          suppliedCount: 0,
        };
      }
    };

    for (const sale of sales as Sale[]) {
      const d = new Date(sale.date);
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      addEntry(label, d);
      map[label].sales.push(sale);
      map[label].salesCount += 1;
      map[label].totalAmount += parseFloat(sale.total_amount as any) || 0;
    }

    for (const dep of deposits as any[]) {
      const d = new Date(dep.date);
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      addEntry(label, d);
      map[label].deposits.push(dep);
      map[label].depositsCount += 1;
      map[label].totalDeposits += parseFloat(dep.amount) || 0;
    }

    for (const u of unsuppliedAll as any[]) {
      const d = new Date(u.created_at || u.date);
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      addEntry(label, d);
      map[label].unsupplied.push(u);
      if (u.status === "pending") map[label].pendingUnsupplied += 1;
      else map[label].suppliedCount += 1;
    }

    return Object.values(map).sort(
      (a, b) => b.rawDate.getTime() - a.rawDate.getTime()
    );
  })();

  const filtered = dailySales.filter((d) =>
    d.date.toLowerCase().includes(query.toLowerCase())
  );
  const selectedDay = dailySales.find((d) => d.date === selectedDate);

  const paymentTotals = selectedDay
    ? selectedDay.sales.reduce(
        (acc, s) => {
          const amt = parseFloat(s.total_amount as any) || 0;
          if (s.payment_method === "cash") { acc.cash += amt; acc.cashCount += 1; }
          else if (s.payment_method === "transfer") { acc.transfer += amt; acc.transferCount += 1; }
          else if (s.payment_method === "pos") { acc.pos += amt; acc.posCount += 1; }
          else if (s.payment_method === "credit") { acc.credit += amt; acc.creditCount += 1; }
          return acc;
        },
        { cash: 0, cashCount: 0, transfer: 0, transferCount: 0, pos: 0, posCount: 0, credit: 0, creditCount: 0 }
      )
    : null;

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function canEditSale(sale: Sale): boolean {
    if (!userRole) return false;
    const days = (Date.now() - new Date(sale.date).getTime()) / (1000 * 3600 * 24);
    if (userRole === "CASHIER") return !sale.receipt_print_count || sale.receipt_print_count < 1;
    if (userRole === "ADMIN" || userRole === "MANAGER") return days <= 7;
    return false;
  }

  const formatCurrency = (v: number | string | undefined) => {
    const n = typeof v === "number" ? v : parseFloat(v as string) || 0;
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(isNaN(n) ? 0 : n)
      .replace("NGN", "₦")
      .trim();
  };

  async function handleMarkSupplied(id: number) {
    try {
      await markSuppliedMutation.mutateAsync(id);
      showSuccess("Marked as supplied!");
      queryClient.invalidateQueries({ queryKey: queryKeys.unsupplied });
    } catch (err: any) {
      showError(err.message || "Failed");
    }
  }

  // ─── Totals for summary cards ──────────────────────────────────────────────
  const grandTotalSales = dailySales.reduce((s, d) => s + d.totalAmount, 0);
  const grandTotalDeposits = dailySales.reduce((s, d) => s + d.totalDeposits, 0);
  const totalPendingUnsupplied = (unsuppliedAll as any[]).filter((u) => u.status === "pending").length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />
          <main className="pt-20 h-screen overflow-hidden flex flex-col">

            {/* ── LIST VIEW ── */}
            {view === "list" && (
              <>
                <div className="flex-shrink-0 p-6 space-y-5">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">Daily Sales Invoices</h1>
                    <p className="text-gray-500 mt-1 text-sm">View all sales, deposits, and unsupplied records by date</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Days</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{dailySales.length}</p>
                      </div>
                      <Calendar className="w-9 h-9 text-blue-500" />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Total Sales</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{dailySales.reduce((s, d) => s + d.salesCount, 0)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{dailySales.reduce((s, d) => s + d.depositsCount, 0)} deposits</p>
                      </div>
                      <Receipt className="w-9 h-9 text-green-500" />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-medium">Revenue + Deposits</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(grandTotalSales + grandTotalDeposits)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Sales: {formatCurrency(grandTotalSales)}</p>
                      </div>
                      <DollarSign className="w-9 h-9 text-purple-500" />
                    </div>

                    {/* ── Unsupplied summary card ── */}
                    <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-amber-700 uppercase font-medium">Unsupplied Pending</p>
                        <p className="text-2xl font-bold text-amber-800 mt-1">{totalPendingUnsupplied}</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          {(unsuppliedAll as any[]).filter((u) => u.status === "supplied").length} supplied
                        </p>
                      </div>
                      <PackageX className="w-9 h-9 text-amber-500" />
                    </div>
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 px-6 pb-6 overflow-y-auto">
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    {isLoading ? (
                      <div className="p-12 text-center text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
                        Loading...
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="p-12 text-center text-gray-400">
                        <FileText className="w-14 h-14 mx-auto mb-3 text-gray-300" />
                        <p>No sales found</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filtered.map((day) => (
                          <button
                            key={day.date}
                            onClick={() => { setSelectedDate(day.date); setView("detail"); }}
                            className="w-full px-6 py-4 hover:bg-gray-50 transition flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <h3 className="font-semibold text-gray-900">{day.date}</h3>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{day.salesCount} sales</span>
                                  {day.depositsCount > 0 && <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{day.depositsCount} deposits</span>}
                                  {day.pendingUnsupplied > 0 && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{day.pendingUnsupplied} unsupplied</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(day.totalAmount)}</p>
                                <p className="text-xs text-gray-500">Sales</p>
                                {day.totalDeposits > 0 && (
                                  <>
                                    <p className="font-semibold text-red-700 mt-0.5">{formatCurrency(day.totalDeposits)}</p>
                                    <p className="text-xs text-red-500">Deposits</p>
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

            {/* ── DETAIL VIEW ── */}
            {view === "detail" && selectedDay && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <button onClick={() => { setView("list"); setSelectedDate(null); }} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium">
                  ← Back to Invoice List
                </button>
                <h1 className="text-2xl font-bold text-gray-800">{selectedDate}</h1>

                {/* Payment Breakdown */}
                <div className="flex flex-wrap gap-4">
                  <div className="bg-gray-50 px-4 py-3 rounded-xl border">
                    <p className="text-xs text-gray-500">Total Sales</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDay.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{selectedDay.salesCount} transactions</p>
                  </div>
                  {paymentTotals?.cashCount ? <div className="px-4 py-3 rounded-xl border bg-green-50"><p className="text-xs text-green-600 font-medium">Cash</p><p className="text-lg font-bold text-green-700">{formatCurrency(paymentTotals.cash)}</p><p className="text-xs text-green-500">{paymentTotals.cashCount} txns</p></div> : null}
                  {paymentTotals?.transferCount ? <div className="px-4 py-3 rounded-xl border bg-blue-50"><p className="text-xs text-blue-600 font-medium">Transfer</p><p className="text-lg font-bold text-blue-700">{formatCurrency(paymentTotals.transfer)}</p><p className="text-xs text-blue-500">{paymentTotals.transferCount} txns</p></div> : null}
                  {paymentTotals?.posCount ? <div className="px-4 py-3 rounded-xl border bg-purple-50"><p className="text-xs text-purple-600 font-medium">POS</p><p className="text-lg font-bold text-purple-700">{formatCurrency(paymentTotals.pos)}</p><p className="text-xs text-purple-500">{paymentTotals.posCount} txns</p></div> : null}
                  {paymentTotals?.creditCount ? <div className="px-4 py-3 rounded-xl border bg-orange-50"><p className="text-xs text-orange-600 font-medium">Credit</p><p className="text-lg font-bold text-orange-700">{formatCurrency(paymentTotals.credit)}</p><p className="text-xs text-orange-500">{paymentTotals.creditCount} txns</p></div> : null}
                  {selectedDay.depositsCount > 0 && <div className="px-4 py-3 rounded-xl border bg-red-50"><p className="text-xs text-red-600 font-medium">Deposits</p><p className="text-lg font-bold text-red-700">{formatCurrency(selectedDay.totalDeposits)}</p><p className="text-xs text-red-500">{selectedDay.depositsCount} deposits</p></div>}
                  {/* Unsupplied summary in detail view */}
                  {selectedDay.unsupplied.length > 0 && (
                    <div className="px-4 py-3 rounded-xl border bg-amber-50">
                      <p className="text-xs text-amber-600 font-medium">Unsupplied</p>
                      <p className="text-lg font-bold text-amber-700">{selectedDay.pendingUnsupplied} pending</p>
                      <p className="text-xs text-amber-500">{selectedDay.suppliedCount} supplied</p>
                    </div>
                  )}
                </div>

                {/* Sales Table */}
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-h-80">
                  <div className="bg-gray-50 border-b px-6 py-3">
                    <h3 className="text-sm font-semibold text-gray-700">Sales</h3>
                  </div>
                  <div className="overflow-y-auto max-h-64">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-50 border-b">
                        <tr>
                          {["Invoice ID", "Customer", "Amount", "Payment", "Time", "Actions"].map((h) => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedDay.sales.map((sale) => {
                          const editable = canEditSale(sale);
                          return (
                            <tr key={sale.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 mr-2">SALE</span>
                                {sale.invoice_id}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{sale.customer_name || "—"}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(sale.total_amount)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 capitalize">{sale.payment_method}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{new Date(sale.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                              <td className="px-4 py-3 text-sm relative">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => { setSelectedSaleId(sale.invoice_id); setView("receipt"); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Receipt</button>
                                  <div className="relative">
                                    <button onClick={() => setDropdownOpen(dropdownOpen === sale.id.toString() ? null : sale.id.toString())} className="p-1 hover:bg-gray-100 rounded">
                                      <MoreVertical className="w-4 h-4 text-gray-500" />
                                    </button>
                                    {dropdownOpen === sale.id.toString() && (
                                      <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-xl z-50 border py-1">
                                        <button onClick={() => { setSelectedSaleId(sale.invoice_id); setView("receipt"); setDropdownOpen(null); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Eye className="w-4 h-4 mr-2 text-blue-500" />View Receipt</button>
                                        <button onClick={() => { if (editable) { setSelectedSaleForEdit(sale); setEditModalOpen(true); setDropdownOpen(null); } }} disabled={!editable} className={`flex items-center w-full px-4 py-2 text-sm ${editable ? "text-gray-700 hover:bg-gray-50" : "text-gray-400 cursor-not-allowed"}`}><Edit className="w-4 h-4 mr-2 text-orange-500" />Edit Sale{!editable && <span className="text-xs ml-1 italic">(Locked)</span>}</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {selectedDay.sales.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No sales this day</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deposits Table */}
                {selectedDay.depositsCount > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-h-64">
                    <div className="bg-red-50 border-b px-6 py-3"><h3 className="text-sm font-semibold text-red-700">Deposits</h3></div>
                    <div className="overflow-y-auto max-h-52">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-red-50 border-b">
                          <tr>
                            {["Deposit ID", "Depositor", "Bank", "Amount", "Time"].map((h) => (
                              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-red-600 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedDay.deposits.map((dep: any) => (
                            <tr key={dep.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900"><span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 mr-2">DEPOSIT</span>DEP-{dep.id}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{dep.depositor_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{dep.bank_name}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-red-700">{formatCurrency(dep.amount)}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{new Date(dep.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Unsupplied Table in detail view ── */}
                {selectedDay.unsupplied.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden max-h-72">
                    <div className="bg-amber-50 border-b px-6 py-3 flex items-center gap-2">
                      <PackageX className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-700">Unsupplied Goods</h3>
                      {selectedDay.pendingUnsupplied > 0 && (
                        <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{selectedDay.pendingUnsupplied} pending</span>
                      )}
                    </div>
                    <div className="overflow-y-auto max-h-60">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-amber-50 border-b">
                          <tr>
                            {["#", "Customer", "Products", "Notes", "Status", "Action"].map((h) => (
                              <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-amber-700 uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedDay.unsupplied.map((u: any) => (
                            <tr key={u.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-700">#{u.id}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-800">{u.customer_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="flex flex-wrap gap-1">
                                  {u.items?.map((item: any, i: number) => (
                                    <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{item.product_name} ×{item.quantity}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400 italic">{u.notes || "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${u.status === "supplied" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                                  {u.status === "supplied" ? <CheckCircle2 className="w-3 h-3" /> : <PackageX className="w-3 h-3" />}
                                  {u.status === "supplied" ? "Supplied" : "Pending"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {u.status === "pending" && (
                                  <button onClick={() => handleMarkSupplied(u.id)} disabled={markSuppliedMutation.isPending} className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 transition disabled:opacity-50">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Mark Supplied
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RECEIPT VIEW ── */}
            {view === "receipt" && (
              <ReceiptView
                saleId={selectedSaleId}
                onDone={() => { setView("detail"); setSelectedSaleId(null); }}
              />
            )}
          </main>
        </div>
      </div>

      {selectedSaleForEdit && (
        <EditSaleModal
          open={editModalOpen}
          onClose={() => { setEditModalOpen(false); setSelectedSaleForEdit(null); }}
          products={products}
          saleId={selectedSaleForEdit.id}
          onSaleUpdated={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.sales });
            setEditModalOpen(false);
            setSelectedSaleForEdit(null);
          }}
        />
      )}
    </ProtectedRoute>
  );
}
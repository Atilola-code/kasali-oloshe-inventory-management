// src/app/expenses/page.tsx - FIXED VERSION
"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Edit, Trash2, Eye, RefreshCw, Calendar, MoreVertical, FileText } from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import CreateExpenseModal from "../components/expenseComponent/CreateExpenseModal";
import ViewExpenseModal from "../components/expenseComponent/ViewExpenseModal";
import EditExpenseModal from "../components/expenseComponent/EditExpenseModal";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";

interface Expense {
  id: number;
  name: string;
  category: string;
  category_display: string;
  amount: number;
  description?: string;
  reference_number?: string;
  recipient?: string;
  payment_method: string;
  date: string;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

interface ExpenseStats {
  total_expenses: number;
  total_count: number;
  by_category: Record<string, number>;
  by_month: { month: string; total: number }[];
  recent_expenses: Expense[];
}

export default function ExpensesPage() {
  const [query, setQuery] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [filterCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen !== null && dropdownRefs.current[dropdownOpen]) {
        const dropdownElement = dropdownRefs.current[dropdownOpen];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setDropdownOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Position dropdowns correctly when table body scrolls
  useEffect(() => {
    if (dropdownOpen !== null && dropdownRefs.current[dropdownOpen] && tableContainerRef.current) {
      const dropdown = dropdownRefs.current[dropdownOpen];
      const tableContainer = tableContainerRef.current;
      
      // Get the button position relative to viewport
      const button = tableContainer.querySelector(`[data-expense-id="${dropdownOpen}"]`);
      if (!button) return;
      
      const buttonRect = button.getBoundingClientRect();
      const containerRect = tableContainer.getBoundingClientRect();
      
      // Check if dropdown would be cut off at bottom
      const dropdownHeight = dropdown.offsetHeight;
      const spaceBelow = containerRect.bottom - buttonRect.bottom;
      
      if (spaceBelow < dropdownHeight + 10) { // 10px buffer
        // Position dropdown above the button
        dropdown.style.bottom = '100%';
        dropdown.style.top = 'auto';
        dropdown.style.marginTop = '0';
        dropdown.style.marginBottom = '8px';
      } else {
        // Position dropdown below the button (default)
        dropdown.style.bottom = 'auto';
        dropdown.style.top = '100%';
        dropdown.style.marginTop = '8px';
        dropdown.style.marginBottom = '0';
      }
    }
  }, [dropdownOpen]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const url = filterCategory !== 'all' 
        ? `/api/expenses/?category=${filterCategory}`
        : '/api/expenses/';
      
      const response = await apiFetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      } else {
        showError("Failed to load expenses");
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
      showError("Error loading expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/expenses/statistics/');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete "${expense.name}"?`)) {
      return;
    }

    try {
      const response = await apiFetch(`/api/expenses/${expense.id}/`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccess("Expense deleted successfully!");
        fetchExpenses();
        fetchStats();
        
        // Trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('dashboardRefresh'));
      } else {
        showError("Failed to delete expense");
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
      showError("Error deleting expense");
    }
    setDropdownOpen(null);
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setViewModalOpen(true);
    setDropdownOpen(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditModalOpen(true);
    setDropdownOpen(null);
  };

  const handleExpenseCreated = () => {
    fetchExpenses();
    fetchStats();
    setCreateModalOpen(false);
    
    // Trigger dashboard refresh to update cash at bank
    window.dispatchEvent(new CustomEvent('dashboardRefresh'));
  };

  const handleExpenseUpdated = () => {
    fetchExpenses();
    fetchStats();
    setEditModalOpen(false);
    setSelectedExpense(null);
    
    // Trigger dashboard refresh
    window.dispatchEvent(new CustomEvent('dashboardRefresh'));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.name.toLowerCase().includes(query.toLowerCase()) ||
    expense.category_display.toLowerCase().includes(query.toLowerCase()) ||
    expense.recipient?.toLowerCase().includes(query.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    salary: 'bg-blue-100 text-blue-800',
    rent: 'bg-purple-100 text-purple-800',
    utilities: 'bg-yellow-100 text-yellow-800',
    supplies: 'bg-green-100 text-green-800',
    maintenance: 'bg-orange-100 text-orange-800',
    transport: 'bg-indigo-100 text-indigo-800',
    marketing: 'bg-pink-100 text-pink-800',
    other: 'bg-gray-100 text-gray-800'
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          {/* ✅ FIXED: Main content with fixed header and scrollable table */}
          <main className="pt-20 h-screen overflow-hidden flex flex-col">
            {/* ✅ Fixed Header Section */}
            <div className="flex-shrink-0 p-6 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
                  <p className="text-gray-600 mt-1">Manage business expenses and track spending</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchExpenses}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Refresh"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    New Expense
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="salary">Salary</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="supplies">Office Supplies</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="transport">Transport</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Stats Cards */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Expenses</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₦{formatCurrency(stats.total_expenses)}
                        </p>
                      </div>
                      <FileText className="w-8 h-8 text-red-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Count</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_count}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 col-span-2">
                    <p className="text-sm text-gray-600 mb-2">Top Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.by_category)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([category, amount]) => (
                          <div key={category} className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg">
                            <span className="text-xs font-medium text-gray-700 capitalize">{category}:</span>
                            <span className="text-xs font-bold text-gray-900">₦{formatCurrency(amount)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ✅ Scrollable Table Section */}
            <div className="flex-1 px-6 pb-6 overflow-y-auto">
              <div 
                ref={tableContainerRef}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col"
              >
                {/* ✅ Fixed Table Header */}
                <div className="flex-shrink-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase w-[20%]">Expense Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase w-[15%]">Category</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase w-[15%]">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase w-[20%]">Recipient</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase w-[15%]">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase w-[15%]">Actions</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* ✅ Scrollable Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-600">Loading expenses...</p>
                          </td>
                        </tr>
                      ) : filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No expenses found
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 w-[20%]">
                              {expense.name}
                            </td>
                            <td className="px-6 py-4 text-sm w-[15%]">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${categoryColors[expense.category] || 'bg-gray-100 text-gray-800'}`}>
                                {expense.category_display}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right w-[15%]">
                              ₦{formatCurrency(expense.amount)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 w-[20%]">
                              {expense.recipient || '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 w-[15%]">
                              {new Date(expense.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 text-sm relative w-[15%]">
                              <div className="relative">
                                <button
                                  data-expense-id={expense.id}
                                  onClick={() => setDropdownOpen(dropdownOpen === expense.id ? null : expense.id)}
                                  className="p-1 hover:bg-gray-100 rounded relative z-10"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>

                                {dropdownOpen === expense.id && (
                                  <>
                                    {/* Backdrop to close when clicking outside */}
                                    <div 
                                      className="fixed inset-0 z-40"
                                      onClick={() => setDropdownOpen(null)}
                                    />
                                    <div 
                                      ref={(el) => {
                                        dropdownRefs.current[expense.id] = el;
                                      }}
                                      className="absolute right-0 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
                                      style={{
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                      }}
                                    >
                                      <div className="py-1">
                                        <button
                                          onClick={() => handleViewExpense(expense)}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                        >
                                          <Eye className="w-4 h-4 mr-3 text-blue-500" />
                                          <div className="text-left">
                                            <div className="font-medium">View Details</div>
                                          </div>
                                        </button>
                                        <button
                                          onClick={() => handleEditExpense(expense)}
                                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                        >
                                          <Edit className="w-4 h-4 mr-3 text-orange-500" />
                                          <div className="text-left">
                                            <div className="font-medium">Edit Expense</div>
                                          </div>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteExpense(expense)}
                                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                                          <div className="text-left">
                                            <div className="font-medium">Delete</div>
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
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <CreateExpenseModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onExpenseCreated={handleExpenseCreated}
      />

      {selectedExpense && (
        <>
          <ViewExpenseModal
            open={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedExpense(null);
            }}
            expense={selectedExpense}
          />

          <EditExpenseModal
            open={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedExpense(null);
            }}
            expense={selectedExpense}
            onExpenseUpdated={handleExpenseUpdated}
          />
        </>
      )}
    </ProtectedRoute>
  );
}
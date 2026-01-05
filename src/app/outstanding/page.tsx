"use client";
import { useEffect, useState } from "react";
import { 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  FileText, 
  MoreVertical, 
  Eye, 
  CheckCircle,
  AlertCircle,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Printer
} from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import ClearCreditModal from "../components/outstandingComponent/ClearCreditModal";
import { Credit, UserRole } from "../types";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/app/utils/toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type DailyCredits = {
  date: string;
  credits: Credit[];
  totalOutstanding: number;
  totalCleared: number;
  creditsCount: number;
  clearedCount: number;
  pendingCount: number;
};

export default function OutstandingPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [dailyCredits, setDailyCredits] = useState<DailyCredits[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCreditForClear, setSelectedCreditForClear] = useState<Credit | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [view, setView] = useState<"list" | "detail">("list");
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'partially_paid' | 'cleared'>('all');
  const [totalOutstandingAmount, setTotalOutstandingAmount] = useState(0);
  const [totalClearedAmount, setTotalClearedAmount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingDashboard, setSyncingDashboard] = useState(false);

  const userRole = user?.role as UserRole | null;

  const syncDashboardManually = async () => {
    setSyncingDashboard(true);
    try {
      triggerDashboardRefresh();
      showSuccess("Dashboard synced successfully!");
    } catch (error) {
      console.error("Error syncing dashboard:", error);
      showError("Failed to sync dashboard");
    } finally {
      setSyncingDashboard(false);
    }
  };
  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCredits();
    setRefreshing(false);
    showSuccess("Credits refreshed successfully!");
  };

  useEffect(() => {
    fetchCredits();
  }, [filterStatus]);

  async function fetchCredits() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = `${API_URL}/api/sales/credits/`;

      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }

      console.log('Fetching credits from:', url);

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (res.ok) {
        const data: Credit[] = await res.json();
        console.log('Credits data received:', data);
        
        // Calculate totals from ALL credits (not filtered by status)
        const allCreditsRes = await fetch(`${API_URL}/api/sales/credits/`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });

        if (allCreditsRes.ok) {
          const allCredits: Credit[] = await allCreditsRes.json();
          
          // Calculate total outstanding from ALL credits (only pending and partially_paid)
          const outstanding = allCredits.reduce((sum, credit) => {
            if (credit.status === 'pending' || credit.status === 'partially_paid') {
              return sum + (Number(credit.outstanding_amount) || 0);
            }
            return sum;
          }, 0);
          
          // Calculate total cleared from ALL credits
          const cleared = allCredits.reduce((sum, credit) => 
            sum + (Number(credit.amount_paid) || 0), 0
          );
          
          console.log('Total outstanding from all credits:', outstanding);
          console.log('Total cleared from all credits:', cleared);
          
          setTotalOutstandingAmount(outstanding);
          setTotalClearedAmount(cleared);
        }
        
        // Group the filtered data for display
        groupCreditsByDate(data);
      } else {
        const errorText = await res.text();
        console.error("API Error:", errorText);
        console.error("Status:", res.status);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  }

  function groupCreditsByDate(credits: Credit[]) {
    const grouped = credits.reduce((acc, credit) => {
      const date = new Date(credit.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = {
          date,
          credits: [],
          totalOutstanding: 0,
          totalCleared: 0,
          creditsCount: 0,
          clearedCount: 0,
          pendingCount: 0
        };
      }

      acc[date].credits.push(credit);
      
      // Only add to outstanding if credit is not cleared
      if (credit.status !== 'cleared') {
        acc[date].totalOutstanding += Number(credit.outstanding_amount) || 0;
      }
      
      acc[date].totalCleared += Number(credit.amount_paid) || 0;
      acc[date].creditsCount += 1;
      
      if (credit.status === 'cleared') {
        acc[date].clearedCount += 1;
      }
      
      if (credit.status === 'pending') {
        acc[date].pendingCount += 1;
      }

      return acc;
    }, {} as Record<string, DailyCredits>);

    const sortedDailyCredits = Object.values(grouped).sort((a, b) => 
      new Date(b.credits[0].date).getTime() - new Date(a.credits[0].date).getTime()
    );

    setDailyCredits(sortedDailyCredits);
  }

  // Add this function to handle dashboard refresh
  const triggerDashboardRefresh = async () => {
    try {
      // Dispatch a custom event that dashboard can listen to
      window.dispatchEvent(new CustomEvent('dashboardRefresh'));
    } catch (error) {
      console.error("Error triggering dashboard refresh:", error);
    }
  };

  function handleClearCredit(credit: Credit) {
    setSelectedCreditForClear(credit);
    setClearModalOpen(true);
    setDropdownOpen(null);
  }

  async function handleMarkAsCleared(credit: Credit) {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/sales/credits/${credit.id}/clear/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          amount_paid: credit.outstanding_amount,
          customer_name: credit.customer_name,
          payment_method: "cash",
          remarks: "Marked as cleared"
        })
      });

      if (response.ok) {
        showSuccess("Credit marked as cleared!");
        fetchCredits();
        triggerDashboardRefresh(); // Refresh dashboard
      } else {
        showError("Failed to mark as cleared");
      }
    } catch (error) {
      console.error("Error marking as cleared:", error);
      showError("Error marking as cleared");
    }
    setDropdownOpen(null);
  }

  async function handleMarkAsPartiallyPaid(credit: Credit) {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/api/sales/credits/${credit.id}/mark-partial/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (response.ok) {
        showSuccess("Credit marked as partially paid!");
        fetchCredits();
        triggerDashboardRefresh(); // Refresh dashboard
      } else {
        showError("Failed to mark as partial");
      }
    } catch (error) {
      console.error("Error marking as partial:", error);
      showError("Error marking as partial");
    }
    setDropdownOpen(null);
  }

  function handleCreditCleared() {
    fetchCredits();
    triggerDashboardRefresh(); // Refresh dashboard
    setClearModalOpen(false);
    setSelectedCreditForClear(null);
    showSuccess("Credit payment recorded successfully!");
  }

  const formatCurrencyPlain = (amount: number | string | undefined) => {
      let numAmount = 0;
      
      if (typeof amount === 'number') {
        numAmount = amount;
      } else if (typeof amount === 'string') {
        numAmount = parseFloat(amount) || 0;
      }
      
      if (isNaN(numAmount)) {
        numAmount = 0;
      }
      
      return numAmount.toLocaleString('en-NG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    };

    // Helper function for status formatting in PDF
    const formatStatusForPDF = (status: string) => {
      switch (status) {
        case 'pending': return 'Pending';
        case 'partially_paid': return 'Partial';
        case 'cleared': return 'Cleared';
        default: return status;
      }
    };

  // PDF Export Function
  const exportToPDF = () => {
    if (!selectedDailyCredit || selectedDailyCredit.credits.length === 0) {
      showError("No credits to export for this date");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Outstanding Credits Report - ${selectedDate}`, 14, 22);
      
      // Add date and summary
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
      doc.text(`Generated at: ${new Date().toLocaleTimeString()}`, 14, 38);
      
      // Add summary stats
      doc.setFontSize(12);
      doc.text(`Total Credits: ${selectedDailyCredit.creditsCount}`, 14, 48);
      doc.text(`Total Outstanding: ${formatCurrency(selectedDailyCredit.totalOutstanding)}`, 14, 54);
      doc.text(`Total Cleared: ${formatCurrency(selectedDailyCredit.totalCleared)}`, 14, 60);
      doc.text(`Cleared Rate: ${selectedDailyCredit.creditsCount > 0 ? 
        Math.round((selectedDailyCredit.clearedCount / selectedDailyCredit.creditsCount) * 100) : 0}%`, 
        14, 66
      );
      
      // Prepare table data
      const tableData = selectedDailyCredit.credits.map(credit => [
        credit.invoice_id,
        credit.customer_name || 'N/A',
        `₦${formatCurrencyPlain(credit.total_amount)}`,
        `₦${formatCurrencyPlain(credit.amount_paid)}`,
        `₦${formatCurrencyPlain(credit.outstanding_amount)}`,
        formatStatusForPDF(credit.status),
        new Date(credit.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      ]);
      
      // Add table
      autoTable(doc, {
        head: [['Invoice ID', 'Customer', 'Total Amount', 'Amount Paid', 'Outstanding', 'Status', 'Time']],
        body: tableData,
        startY: 76,
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        margin: { left: 14, right: 14 },
        theme: 'striped'
      });
      
      // Save the PDF
      doc.save(`outstanding-credits-${selectedDate?.replace(/\s+/g, '-')}.pdf`);
      showSuccess("PDF exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      showError("Failed to export PDF. Please try again.");
    }
  };
 

  const selectedDailyCredit = dailyCredits.find(d => d.date === selectedDate);

  const filteredDailyCredits = dailyCredits.filter(daily =>
    daily.date.toLowerCase().includes(query.toLowerCase()) ||
    daily.credits.some(credit => 
      credit.customer_name.toLowerCase().includes(query.toLowerCase()) ||
      credit.invoice_id.toLowerCase().includes(query.toLowerCase())
    )
  );

  // Calculate totals for display
  const totalOutstanding = dailyCredits.reduce((sum, d) => sum + d.totalOutstanding, 0);
  const totalCleared = dailyCredits.reduce((sum, d) => sum + d.totalCleared, 0);
  const totalCredits = dailyCredits.reduce((sum, d) => sum + d.creditsCount, 0);
  const totalClearedCount = dailyCredits.reduce((sum, d) => sum + d.clearedCount, 0);

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
    
    // Format with commas and 0 decimal places
    return '₦' + numAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Helper function to format numbers without currency symbol
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cleared':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Cleared
        </span>;
      case 'partially_paid':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Partially Paid
        </span>;
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pending
        </span>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          <main className="pt-20 p-6">
            {view === "list" && (
              <div>
                <div className="mb-6 mt-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-800">Outstanding Credits</h1>
                      <p className="text-gray-600 mt-1">Manage and track credit sales</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={syncDashboardManually}
                        disabled={syncingDashboard || loading}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        title="Sync with dashboard"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncingDashboard ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        title="Refresh credits"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          filterStatus === 'all' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          filterStatus === 'pending' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => setFilterStatus('partially_paid')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          filterStatus === 'partially_paid' 
                            ? 'bg-yellow-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Partial
                      </button>
                      <button
                        onClick={() => setFilterStatus('cleared')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          filterStatus === 'cleared' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Cleared
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                        <p className="text-2xl font-bold text-red-900">
                          {formatCurrency(totalOutstandingAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dailyCredits.reduce((sum, d) => sum + d.creditsCount, 0)} credit(s)
                        </p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-red-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Cleared</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(totalClearedAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dailyCredits.reduce((sum, d) => sum + d.clearedCount, 0)} cleared
                        </p>
                      </div>
                      <TrendingDown className="w-10 h-10 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Pending Credits</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {totalCredits - totalClearedCount}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Awaiting payment
                        </p>
                      </div>
                      <AlertCircle className="w-10 h-10 text-yellow-600" />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Cleared Rate</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {totalCredits > 0 ? Math.round((totalClearedCount / totalCredits) * 100) : 0}%
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Completion rate
                        </p>
                      </div>
                      <CheckCircle className="w-10 h-10 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Daily Credits List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  {loading ? (
                    <div className="p-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      Loading credits...
                    </div>
                  ) : filteredDailyCredits.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p>No credit sales found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredDailyCredits.map((daily) => (
                        <button
                          key={daily.date}
                          onClick={() => {
                            setSelectedDate(daily.date);
                            setView("detail");
                          }}
                          className="w-full px-6 py-2 hover:bg-gray-50 transition flex items-center justify-between group"
                        >
                          <div className="flex items-center mt-4 mb-4 gap-4">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-red-600" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900">{daily.date}</h3>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  {daily.creditsCount} credits
                                </span>
                                {daily.clearedCount > 0 && (
                                  <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                                    {daily.clearedCount} cleared
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-red-900">
                                {formatCurrency(daily.totalOutstanding)}
                              </p>
                              <p className="text-sm text-red-600">Outstanding</p>
                              {daily.totalCleared > 0 && (
                                <>
                                  <p className="font-semibold text-green-700 mt-1">
                                    {formatCurrency(daily.totalCleared)}
                                  </p>
                                  <p className="text-sm text-green-600">Cleared</p>
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
            )}

            {view === "detail" && selectedDailyCredit && (
              <div>
                <div className="mb-6 mt-8">
                  <button
                    onClick={() => {
                      setView("list");
                      setSelectedDate(null);
                    }}
                    className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
                  >
                    ← Back to Credit List
                  </button>
                  <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">{selectedDate}</h1>
                    <div className="flex gap-2">
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        onClick={exportToPDF}
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </button>
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        onClick={() => window.print()}
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="bg-red-50 px-3 py-2 rounded-lg">
                      <p className="text-sm text-red-600">Outstanding: {formatCurrency(selectedDailyCredit.totalOutstanding)}</p>
                    </div>
                    <div className="bg-green-50 px-3 py-2 rounded-lg">
                      <p className="text-sm text-green-600">Cleared: {formatCurrency(selectedDailyCredit.totalCleared)}</p>
                    </div>
                    <div className="bg-gray-50 px-3 py-2 rounded-lg">
                      <p className="text-sm text-gray-600">Total Credits: {selectedDailyCredit.creditsCount}</p>
                    </div>
                    <div className="bg-blue-50 px-3 py-2 rounded-lg">
                      <p className="text-sm text-blue-600">Cleared Rate: {
                        selectedDailyCredit.creditsCount > 0 ? 
                          Math.round((selectedDailyCredit.clearedCount / selectedDailyCredit.creditsCount) * 100) : 0
                      }%</p>
                    </div>
                  </div>
                </div>

                {/* Credits Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice ID</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount Paid</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Outstanding</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedDailyCredit.credits.map((credit) => (
                          <tr key={credit.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {credit.invoice_id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{credit.customer_name || '—'}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {formatCurrency(credit.total_amount)}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-700">
                              {formatCurrency(credit.amount_paid)}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-red-700">
                              {formatCurrency(credit.outstanding_amount)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {getStatusBadge(credit.status)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(credit.date).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 text-sm relative">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleClearCredit(credit)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Clear Credit
                                </button>
                                <button
                                  onClick={() => setDropdownOpen(dropdownOpen === credit.id.toString() ? null : credit.id.toString())}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                              
                              {dropdownOpen === credit.id.toString() && (
                                <div className="absolute right-6 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                  <div className="py-1">
                                    <button
                                      onClick={() => handleClearCredit(credit)}
                                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Record Payment
                                    </button>
                                    <button
                                      onClick={() => handleMarkAsCleared(credit)}
                                      disabled={credit.status === 'cleared'}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        credit.status !== 'cleared'
                                          ? 'text-gray-700 hover:bg-gray-100'
                                          : 'text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Mark as Cleared
                                    </button>
                                    <button
                                      onClick={() => handleMarkAsPartiallyPaid(credit)}
                                      disabled={credit.status === 'partially_paid'}
                                      className={`flex items-center w-full px-4 py-2 text-sm ${
                                        credit.status !== 'partially_paid'
                                          ? 'text-gray-700 hover:bg-gray-100'
                                          : 'text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      Mark as Partial
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Clear Credit Modal */}
      {selectedCreditForClear && (
        <ClearCreditModal
          open={clearModalOpen}
          onClose={() => {
            setClearModalOpen(false);
            setSelectedCreditForClear(null);
          }}
          credit={selectedCreditForClear}
          onCreditCleared={handleCreditCleared}
        />
      )}
    </ProtectedRoute>
  );
}
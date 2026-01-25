"use client";
import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw,
  Clock,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import { 
  BarChart, Bar, 
  LineChart as RechartsLineChart, Line, 
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";


interface ReportStats {
  totalSales: number;
  totalCost: number; // ✅ Changed from totalPurchases
  profit: number;
  salesChange: number;
  costChange: number; // ✅ Changed from purchasesChange
  profitChange: number;
}

interface MonthlyData {
  month: string;
  sales: number;
  purchases: number;
  cost: number;
  profit: number;
}

interface DailySales {
  date: string;
  amount: number;
  transactions: number;
  avgTransaction: number;
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  quantity: number;
  revenue: number;
  color?: string;
  [key: string]: any;
}

export default function ReportsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalCost: 0,
    profit: 0,
    salesChange: 0,
    costChange: 0,
    profitChange: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4',
    '#FFA07A', '#20B2AA', '#778899', '#9370DB'
  ];

  useEffect(() => {
    fetchReportData();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, [selectedPeriod]);

  async function fetchReportData() {
    setLoading(true);
    try {
      const [salesRes, inventoryRes, purchaseRes] = await Promise.all([
        apiFetch('/api/sales/'),
        apiFetch('/api/inventory/'),
        apiFetch('/api/purchase-orders/?status=approved')
      ]);

      let salesData: any[] = [];
      let inventoryData: any[] = [];
      let purchaseData: any[] = [];

      if (salesRes.ok) {
        const data = await salesRes.json();
        salesData = Array.isArray(data) ? data : [];
        console.log('📊 Sales data:', salesData.length, 'records');
      }
      
      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        inventoryData = Array.isArray(data) ? data : [];
        console.log('📋 Inventory:', inventoryData.length, 'products');
      }

      if (purchaseRes.ok) {
      const data = await purchaseRes.json();
      // Handle both array response and paginated response
      if (Array.isArray(data)) {
        purchaseData = data;
      } else if (data.result && Array.isArray(data.result)) {
        purchaseData = data.result;
      } else if (Array.isArray(data.purchase_orders)) {
        purchaseData = data.purchase_orders;
      }
      console.log('🛒 Approved Purchases:', purchaseData.length, 'records');
    }

    processReportData(salesData, inventoryData, purchaseData);
    
  } catch (error) {
    console.error("❌ Error fetching report data:", error);
      showError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  function processReportData(salesData: any[], inventoryData: any[], purchaseData: any[]) {
    if (!Array.isArray(salesData)) salesData = [];
    if (!Array.isArray(inventoryData)) inventoryData = [];
    if (!Array.isArray(purchaseData)) purchaseData = [];

    // ✅ Create product cost map
    const productCostMap = new Map<number, number>();
    inventoryData.forEach((product: any) => {
      productCostMap.set(product.id, product.cost_price || 0);
    });

    // ✅ Calculate ACTUAL profit (revenue - cost of goods sold)
    let totalSales = 0;
    let totalCost = 0;
    let totalPurchases = 0;

    salesData.forEach((sale: any) => {
      const saleRevenue = parseFloat(sale.total_amount) || 0;
      totalSales += saleRevenue;

      // Calculate cost for each sale item
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const productId = item.product_id;
          const quantity = parseInt(item.quantity) || 0;
          const costPrice = productCostMap.get(productId) || 0;
          totalCost += quantity * costPrice;
        });
      }
    });

    // ✅ Process approved purchases
    purchaseData.forEach((purchase: any) => {
      // Only include approved purchases
      if (purchase.status === 'approved' || purchase.status === 'received') {
        // Add purchase amount to purchases total
        const purchaseAmount = parseFloat(purchase.total_amount) || 0;
        totalPurchases += purchaseAmount;
        
        // IMPORTANT: Add purchase cost to total cost as well
        // When you purchase goods, that's also part of your costs
        if (purchase.items && Array.isArray(purchase.items)) {
          purchase.items.forEach((item: any) => {
            const productId = item.product_id;
            const quantity = parseInt(item.quantity) || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            totalCost += quantity * unitPrice; // Purchase cost
          });
        }
      }
    });
    
    const profit = totalSales - totalCost;

    console.log('💰 Profit Calculation:', {
      totalSales,
      totalCost,
      totalPurchases,
      profit,
      profitMargin: totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) + '%' : '0%'
    });

    const monthly = generateMonthlyData(salesData,purchaseData, productCostMap);
    const daily = generateDailySales(salesData);
    const categories = generateCategoryData(salesData, inventoryData);

    setStats({
      totalSales,
      totalCost,
      profit,
      salesChange: calculateChange(totalSales, monthly, 'sales'),
      costChange: calculateChange(totalCost, monthly, 'cost'),
      profitChange: calculateChange(profit, monthly, 'profit'),
    });

    setMonthlyData(monthly);
    setDailySales(daily);
    setCategoryData(categories);
  }

  function generateMonthlyData(salesData: any[], purchaseData: any[], productCostMap: Map<number, number>): MonthlyData[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map(month => {
      const monthIndex = months.indexOf(month);
      
      // Filter sales for this month
      const monthSalesData = salesData.filter(sale => {
        const saleDate = new Date(sale.date || sale.created_at);
        return saleDate.getFullYear() === currentYear && 
               saleDate.getMonth() === monthIndex;
      });

      // Filter purchases for this month (approved/received only)
      const monthPurchaseData = purchaseData.filter(purchase => {
        const purchaseDate = new Date(purchase.order_date || purchase.created_at);
        return purchaseDate.getFullYear() === currentYear && 
              purchaseDate.getMonth() === monthIndex &&
              (purchase.status === 'approved' || purchase.status === 'received');
      });

      // Calculate revenue
      const monthSales = monthSalesData.reduce((sum, sale) => 
        sum + (parseFloat(sale.total_amount) || 0), 0
      );

      // ✅ Calculate actual cost for this month
      let monthCost = 0;
      monthSalesData.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            const productId = item.product_id;
            const quantity = parseInt(item.quantity) || 0;
            const costPrice = productCostMap.get(productId) || 0;
            monthCost += quantity * costPrice;
          });
        }
      });

      monthPurchaseData.forEach(purchase => {
      if (purchase.items && Array.isArray(purchase.items)) {
        purchase.items.forEach((item: any) => {
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || 0;
          monthCost += quantity * unitPrice;
        });
      }
    });

    // Calculate purchases total for display
    const monthPurchases = monthPurchaseData.reduce((sum, purchase) => 
      sum + (parseFloat(purchase.total_amount) || 0), 0
    );

    return {
      month,
      sales: monthSales,
      cost: monthCost,
      purchases: monthPurchases, 
      profit: monthSales - monthCost
    };
  });
}

  function generateDailySales(salesData: any[]): DailySales[] {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const date = new Date(dateStr);
      const daySales = salesData.filter(sale => {
        const saleDate = new Date(sale.date || sale.created_at);
        return saleDate.toISOString().split('T')[0] === dateStr;
      });

      const totalAmount = daySales.reduce((sum, sale) => 
        sum + (parseFloat(sale.total_amount) || 0), 0
      );

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: totalAmount,
        transactions: daySales.length,
        avgTransaction: daySales.length > 0 ? totalAmount / daySales.length : 0
      };
    });
  }

  function generateCategoryData(salesData: any[], inventoryData: any[]): CategoryData[] {
    const categoryMap = new Map<string, { quantity: number, revenue: number }>();
    let totalSold = 0;

    const productCategoryMap = new Map<number, string>();
    inventoryData.forEach((product: any) => {
      productCategoryMap.set(product.id, product.category || "Uncategorized");
    });

    salesData.forEach((sale: any) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const productId = item.product_id;
          const category = productCategoryMap.get(productId) || "Uncategorized";
          const quantity = parseInt(item.quantity) || 0;
          const price = parseFloat(item.price || item.unit_price) || 0;
          const itemRevenue = quantity * price;
          
          totalSold += quantity;

          if (categoryMap.has(category)) {
            const current = categoryMap.get(category)!;
            categoryMap.set(category, {
              quantity: current.quantity + quantity,
              revenue: current.revenue + itemRevenue
            });
          } else {
            categoryMap.set(category, { quantity, revenue: itemRevenue });
          }
        });
      }
    });

    return Array.from(categoryMap.entries())
      .map(([name, { quantity, revenue }], index) => ({
        name,
        value: quantity,
        percentage: totalSold > 0 ? (quantity / totalSold) * 100 : 0,
        quantity,
        revenue,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.quantity - a.quantity);
  }

  function calculateChange(current: number, monthlyData: MonthlyData[], field: 'sales' | 'cost' | 'profit'): number {
    if (monthlyData.length < 2) return 0;
    const prevMonth = monthlyData[monthlyData.length - 2];
    const currentMonth = monthlyData[monthlyData.length - 1];
    const prevValue = currentMonth.month === 'Dec' ? 0 : prevMonth[field];
    return prevValue > 0 ? ((current - prevValue) / prevValue) * 100 : 0;
  }

  const handleRefresh = () => {
    fetchReportData();
    showSuccess("Report data refreshed!");
  };

  const handleExport = () => {
    showSuccess("Export feature coming soon!");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ₦{formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-bold text-gray-800">{data.name}</p>
          <p className="text-sm text-gray-600">
            Quantity Sold: <span className="font-semibold">{data.quantity}</span>
          </p>
          <p className="text-sm text-gray-600">
            Percentage: <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
          </p>
          <p className="text-sm text-gray-600">
            Revenue: <span className="font-semibold">₦{formatCurrency(data.revenue)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (entry: any) => {
    const name = entry.name || '';
    const percent = entry.percent || 0;
    return `${name}: ${(percent * 100).toFixed(1)}%`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64">
          <Topbar query={query} setQuery={setQuery} />

          <main className="pt-20 p-6 mt-4">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Reports & Analytics</h1>
                  <p className="text-gray-600 mt-1 text-sm md:text-base">Comprehensive sales, purchase, and inventory insights</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm md:text-base flex-1 md:flex-none"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm md:text-base flex-1 md:flex-none"
                    disabled={loading}
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by:</span>
                </div>
                
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-2 w-full md:w-auto">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                  >
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                    />
                    <span className="text-gray-500 hidden sm:inline">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards*/}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading report data...</p>
              </div>
            ) : (
              <>
                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600">Total Sales</h3>
                        <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                          ₦{formatCurrency(stats.totalSales)}
                        </p>
                      </div>
                      <div className="p-2 md:p-3 bg-blue-100 rounded-xl">
                        <DollarSign className="text-blue-600" size={20} />
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${stats.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.salesChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span className="text-xs md:text-sm font-medium">
                        {stats.salesChange >= 0 ? '+' : ''}{stats.salesChange.toFixed(1)}% from last period
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600">Cost of Goods Sold</h3>
                        <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                          ₦{formatCurrency(stats.totalCost)}
                        </p>
                      </div>
                      <div className="p-2 md:p-3 bg-purple-100 rounded-xl">
                        <ShoppingCart className="text-purple-600" size={20} />
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${stats.costChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.costChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span className="text-xs md:text-sm font-medium">
                        {stats.costChange >= 0 ? '+' : ''}{stats.costChange.toFixed(1)}% from last period
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-600">Net Profit</h3>
                        <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                          ₦{formatCurrency(stats.profit)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ({stats.totalSales > 0 ? ((stats.profit / stats.totalSales) * 100).toFixed(1) : '0'}% Margin)
                        </p>
                      </div>
                      <div className="p-2 md:p-3 bg-green-100 rounded-xl">
                        <TrendingUp className="text-green-600" size={20} />
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${stats.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.profitChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      <span className="text-xs md:text-sm font-medium">
                        {stats.profitChange >= 0 ? '+' : ''}{stats.profitChange.toFixed(1)}% from last period
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Revenue & Cost Trends */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                          <LineChart className="text-blue-600" size={20} />
                          Revenue & Cost Trends
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">Monthly comparison</p>
                      </div>
                      <Calendar className="text-gray-400" size={18} />
                    </div>
                    <div className="h-56 md:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="sales" 
                            name="Sales" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="purchases" 
                            name="Purchases" 
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Category Distribution */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <div>
                        <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                          <PieChart className="text-blue-600" size={20} />
                          Sales by Category
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">Revenue distribution</p>
                      </div>
                      <Package className="text-gray-400" size={18} />
                    </div>
                    <div className="h-56 md:h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTooltip />} />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Category Breakdown Table */}
                    <div className="mt-6 overflow-hidden">
                      <h3 className="text-md md:text-lg font-semibold text-gray-700 mb-4">Category Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qty Sold</th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">%</th>
                              <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {categoryData.map((category, index) => (
                              <tr key={category.name} className="hover:bg-gray-50">
                                <td className="px-3 py-2 md:px-4 md:py-3">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded" 
                                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <span className="text-sm font-medium text-gray-700 truncate max-w-[100px]">
                                      {category.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm text-gray-600">
                                  {category.quantity}
                                </td>
                                <td className="px-3 py-2 md:px-4 md:py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-700">
                                      {category.percentage.toFixed(1)}%
                                    </span>
                                    <div className="hidden sm:block flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${category.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 md:px-4 md:py-3 text-sm font-semibold text-gray-900">
                                  ₦{formatCurrency(category.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Sales Report - Responsive */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-2">
                    <div>
                      <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="text-blue-600" size={20} />
                        Daily Sales Report
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Last 7 days performance</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {dailySales.length} days shown
                    </div>
                  </div>
                  <div className="h-56 md:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar 
                          dataKey="amount" 
                          name="Sales Amount" 
                          fill="#3b82f6" 
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="transactions" 
                          name="Transactions" 
                          fill="#8b5cf6" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Avg Daily Sales</p>
                      <p className="text-lg md:text-xl font-bold text-gray-900 mt-1">
                        ₦{formatCurrency(dailySales.reduce((sum, day) => sum + day.amount, 0) / dailySales.length)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total Transactions</p>
                      <p className="text-lg md:text-xl font-bold text-gray-900 mt-1">
                        {dailySales.reduce((sum, day) => sum + day.transactions, 0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Best Day</p>
                      <p className="text-lg md:text-xl font-bold text-gray-900 mt-1 truncate">
                        {dailySales.reduce((best, day) => day.amount > best.amount ? day : best, dailySales[0])?.date || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Reports - Responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Profit Trend */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <h3 className="text-md md:text-lg font-bold text-gray-800 mb-4">Profit Trend</h3>
                    <div className="h-48 md:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="profit" 
                            name="Profit" 
                            stroke="#10b981" 
                            fill="#10b981" 
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                    <h3 className="text-md md:text-lg font-bold text-gray-800 mb-4">Monthly Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Month</th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cost</th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Profit</th>
                            <th className="px-3 py-2 md:px-4 md:py-3 text-left text-xs font-semibold text-gray-600 uppercase">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {monthlyData.map((month, index) => {
                            const margin = month.sales > 0 ? ((month.profit / month.sales) * 100) : 0;
                            return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm font-medium text-gray-700">{month.month}</td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm text-gray-600">₦{formatCurrency(month.sales)}</td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm text-gray-600">₦{formatCurrency(month.purchases || 0)}</td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm text-gray-600">₦{formatCurrency(month.cost)}</td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm font-semibold text-gray-900">
                                <span className={month.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  ₦{formatCurrency(month.profit)}
                                </span>
                              </td>
                              <td className="px-3 py-2 md:px-4 md:py-3 text-sm font-semibold text-gray-900">
                                <span className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {typeof margin === 'number' ? margin.toFixed(1) : '0.0'}%
                                </span>
                              </td>
                            </tr>
                            )
                          })} 
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
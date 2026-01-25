//src/app/purchase-orders/PurchaseOrdersStats.tsx
import { Package, FileText, CheckCircle, TrendingUp } from "lucide-react";
import { POStatistics } from "../types";

interface PurchaseOrdersStatsProps {
  statistics: POStatistics | null;
  formatCurrency: (amount: number) => string;
}

export default function PurchaseOrdersStats({ statistics, formatCurrency }: PurchaseOrdersStatsProps) {
  if (!statistics) return null;

  return (
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
  );
}
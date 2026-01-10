import { Search, RefreshCw } from "lucide-react";

interface PurchaseOrdersFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
}

export default function PurchaseOrdersFilters({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  onRefresh
}: PurchaseOrdersFiltersProps) {
  return (
    <div className="flex items-center gap-3 mt-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by PO number or supplier..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        onClick={onRefresh}
        className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50"
        title="Refresh"
      >
        <RefreshCw className="w-5 h-5 text-gray-600" />
      </button>
      <div className="flex items-center gap-2">
        <select
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
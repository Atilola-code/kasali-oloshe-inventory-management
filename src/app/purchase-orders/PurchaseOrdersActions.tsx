//src/app/purchase-orders/PurchaseOrdersActions.tsx
import { Plus } from "lucide-react";

interface PurchaseOrdersActionsProps {
  onCreatePO: () => void;
  productsLoading: boolean;
}

export default function PurchaseOrdersActions({ 
  onCreatePO, 
  productsLoading 
}: PurchaseOrdersActionsProps) {
  return (
    <button
      onClick={onCreatePO}
      disabled={productsLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition mr-8 ${
        productsLoading 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
    >
      <Plus className="w-4 h-4" />
      Create PO
    </button>
  );
}
// src/app/components/salesComponent/StopSaleButton.tsx
"use client";
import { useState, useEffect } from "react";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface StopSaleButtonProps {
  onStatusChange: () => void;
}

export default function StopSaleButton({ onStatusChange }: StopSaleButtonProps) {
  const { user } = useAuth();
  const [isStopped, setIsStopped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");

  // Check if user is ADMIN or MANAGER
  const canToggleSale = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Fetch stop sale status on mount
  useEffect(() => {
    fetchStopSaleStatus();
  }, []);

  const fetchStopSaleStatus = async () => {
    try {
      const response = await apiFetch('/api/sales/stop-sale/status/');
      if (response.ok) {
        const data = await response.json();
        setIsStopped(data.is_sale_stopped);
      }
    } catch (error) {
      console.error("Error fetching stop sale status:", error);
    }
  };

  const handleToggle = async () => {
    if (!canToggleSale) {
      showError("Only administrators and managers can stop sales");
      return;
    }

    const action = isStopped ? 'resume' : 'stop';
    
    // If stopping, show modal for reason
    if (action === 'stop') {
      setShowModal(true);
      return;
    }

    // If resuming, just proceed
    await executeToggle(action);
  };

  const executeToggle = async (action: 'stop' | 'resume') => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/sales/stop-sale/toggle/', {
        method: 'POST',
        body: JSON.stringify({
          action,
          reason: action === 'stop' ? reason : ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsStopped(data.is_sale_stopped);
        showSuccess(data.message || `Sales ${action === 'stop' ? 'stopped' : 'resumed'} successfully`);
        
        // Clear reason and close modal
        setReason("");
        setShowModal(false);
        
        // Notify parent component
        onStatusChange();
      } else {
        const errorData = await response.json();
        showError(errorData.error || `Failed to ${action} sales`);
      }
    } catch (error) {
      console.error(`Error ${action}ing sales:`, error);
      showError(`Error ${action}ing sales`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopSale = () => {
    executeToggle('stop');
  };

  if (!canToggleSale) {
    return null; // Don't show button for non-admin/manager users
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
          isStopped
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-600 text-white hover:bg-red-700'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isStopped ? "Resume Sales" : "Stop Sales"}
      >
        {isStopped ? (
          <>
            <Unlock className="w-4 h-4" />
            Resume Sales
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Stop Sales
          </>
        )}
      </button>

      {/* Stop Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Stop Sales</h3>
                  <p className="text-sm text-gray-600">This will prevent cashiers from making sales</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for stopping sales..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setReason("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStopSale}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {loading ? "Stopping..." : "Stop Sales"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
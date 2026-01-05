// src/components/salesComponent/StopSaleButton.tsx
"use client";
import { useState, useEffect } from "react";
import { Power, PowerOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/app/utils/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface StopSaleButtonProps {
  onStatusChange?: () => void;
}

export default function StopSaleButton({ onStatusChange }: StopSaleButtonProps) {
  const { user } = useAuth();
  const [isSaleStopped, setIsSaleStopped] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStopSaleStatus();
  }, []);

  async function fetchStopSaleStatus() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/sales/stop-sale/status/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setIsSaleStopped(data.is_sale_stopped);
      }
    } catch (error) {
      console.error("Error fetching stop sale status:", error);
    }
  }

  async function toggleStopSale() {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      showError("Only admins and managers can stop sales");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const action = isSaleStopped ? "resume" : "stop";
      
      const res = await fetch(`${API_URL}/api/sales/stop-sale/toggle/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          action: action,
          reason: action === "stop" ? "Manual stop by user" : ""
        })
      });

      if (res.ok) {
        const data = await res.json();
        setIsSaleStopped(data.is_sale_stopped);
        showSuccess(
          action === "stop" 
            ? "Sales stopped successfully!" 
            : "Sales resumed successfully!"
        );
        
        // Call callback if provided
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        const error = await res.json();
        showError(error.error || "Failed to update sale status");
      }
    } catch (error) {
      console.error("Error toggling stop sale:", error);
      showError("Failed to update sale status");
    } finally {
      setLoading(false);
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleStopSale}
        disabled={loading}
        className={`flex items-center text-sm rounded-xl gap-2 px-3 py-2 font-medium transition ${
          isSaleStopped
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isSaleStopped ? "Resume sales" : "Stop sales"}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : isSaleStopped ? (
          <>
            <Power className="w-4 h-4" />
            Resume Sales
          </>
        ) : (
          <>
            <PowerOff className="w-4 h-4" />
            Stop Sales
          </>
        )}
      </button>
    </div>
  );
}
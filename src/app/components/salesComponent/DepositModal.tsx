// src/app/components/salesComponent/DepositModal.tsx
"use client";
import { useState } from "react";
import { X, Building, User, Banknote } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";


interface DepositModalProps {
  open: boolean;
  onClose: () => void;
  onDepositCompleted: () => void;
}

export default function DepositModal({ open, onClose, onDepositCompleted }: DepositModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    depositor_name: "",
    bank_name: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError("Please enter a valid deposit amount");
      return;
    }

    if (!formData.depositor_name.trim()) {
      showError("Please enter depositor's name");
      return;
    }

    if (!formData.bank_name.trim()) {
      showError("Please enter bank name");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        showError("Authentication token not found. Please login again.");
        setLoading(false);
        return;
      }

      console.log("Sending deposit request to:", '/api/sales/deposits/');
      console.log("With data:", {
        amount: parseFloat(formData.amount),
        depositor_name: formData.depositor_name,
        bank_name: formData.bank_name
      });

      const response = await apiFetch('api/sales/deposits/', {
        method: "POST",  
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          depositor_name: formData.depositor_name,
          bank_name: formData.bank_name
          // date and created_by will be auto-set by Django
        })
      });

      console.log("Deposit API Response:", response.status);

      const responseText = await response.text();
      console.log("Deposit API Response Text:", responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          showSuccess("Cash deposit recorded successfully!");
          setFormData({ amount: "", depositor_name: "", bank_name: "" });
          onDepositCompleted();
          onClose();
        } catch (parseError) {
          console.error("Error parsing JSON:", parseError);
          showSuccess("Cash deposit recorded successfully!");
          setFormData({ amount: "", depositor_name: "", bank_name: "" });
          onDepositCompleted();
          onClose();
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          showError(errorData.detail || errorData.message || `Failed to record deposit (Status: ${response.status})`);
        } catch {
          showError(`Failed to record deposit: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error: any) {
      console.error("Network error recording deposit:", error);
      showError(`Network error: ${error.message || "Failed to connect to server"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Record Cash Deposit</h2>
              <p className="text-sm text-gray-600">Record cash deposited to bank</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deposit Amount (₦)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Banknote className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Depositor's Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="depositor_name"
                value={formData.depositor_name}
                onChange={handleChange}
                placeholder="Enter depositor's name"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="Enter bank name"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Recording...
                </>
              ) : (
                "Record Deposit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
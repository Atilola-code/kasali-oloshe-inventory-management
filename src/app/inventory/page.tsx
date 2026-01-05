// src/app/inventory/page.tsx
"use client";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import InventoryDashboardPage from "../components/InventoryDashboard";

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryDashboardPage />
    </ProtectedRoute>
  );
}
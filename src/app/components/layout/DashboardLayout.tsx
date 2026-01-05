// src/app/components/layout/DashboardLayout.tsx
"use client";
import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type Props = {
  children: React.ReactNode;
  query: string;
  setQuery: (query: string) => void;
  setView: (view: "products" | "sales" | "receipt") => void;
  view: "products" | "sales" | "receipt";
  onRegisterClick?: () => void;
};

export default function DashboardLayout({ children, query, setQuery, setView, view, onRegisterClick }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Sidebar />
      <div className="ml-64">
        <Topbar query={query} setQuery={setQuery} onRegisterClick={onRegisterClick} />
        <main className="pt-16 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
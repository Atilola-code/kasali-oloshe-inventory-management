// src/app/components/layout/Topbar.tsx
"use client";
import { Search, Bell, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  query: string;
  setQuery: (query: string) => void;
  onRegisterClick?: () => void;
};

export default function Topbar({ query, setQuery, onRegisterClick }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't show topbar on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  // If not logged in, show auth navigation
  if (!user) {
    return (
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 fixed left-0 right-0 top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
            KO
          </div>
          <span className="font-bold text-xl">Kasali Oloshe</span>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Sign Up
          </Link>
        </div>
      </header>
    );
  }

  // Logged in topbar
  return (
    <header className="h-20 bg-white border-b flex items-center justify-between px-6 fixed left-64 right-0 top-0 z-40">
      <div className="flex items-center gap-4 w-2/3">
        <div className="relative flex items-center w-full">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..." 
            className="border rounded-xl p-2 pl-10 w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Add User Button - Only for Admin/Manager */}
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && onRegisterClick && (
          <button
            onClick={onRegisterClick}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 transition"
          >
            <UserPlus size={18} />
            Add User
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
          <span className="absolute top-1 right-1 bg-red-500 rounded-full w-2 h-2" />
          <Bell className="h-5 w-5 text-gray-600" />
        </button>

        {/* User Profile Display */}
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">
              {user.first_name} {user.last_name}
            </div>
            <div className="text-xs text-gray-500 uppercase">
              {user.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
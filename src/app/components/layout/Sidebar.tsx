// src/app/components/layout/Sidebar.tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  Settings, 
  BarChart3, 
  Boxes, 
  Receipt, 
  LogOut, 
  LockIcon, 
  DollarSign, 
  BadgeDollarSign,
  X,
  AlertCircle,
  MessagesSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { showError } from "@/app/utils/toast";
import { useState } from "react";

const links = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
  { name: "Inventory", href: "/inventory", icon: Boxes, roles: ['ADMIN', 'MANAGER'], viewableBy: ['ADMIN', 'MANAGER','CASHIER'] },
  { name: "Sale", href: "/sales", icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { name: "Outstanding Payments", href: "/outstanding", icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
  { name: "Purchase Orders", href: "/purchase-orders", icon: Package, roles: ['ADMIN', 'MANAGER'] },
  { name: "User Management", href: "/users", icon: Users, roles: ['ADMIN', 'MANAGER']},
  { name: "Live chat", href: "/live-chat", icon: MessagesSquare, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { name: "Invoices", href: "/invoices", icon: Receipt, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { name: "Tax Computation", href: "/tax", icon: BadgeDollarSign, roles: ['ADMIN', 'MANAGER'] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ['ADMIN', 'MANAGER', 'CASHIER']},
];

// Logout Modal Component
function LogoutModal({ isOpen, onClose, onConfirm }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-gray-700 mb-2">
                Are you sure you want to log out?
              </p>
              <p className="text-sm text-gray-500">
                You'll need to sign in again to access the inventory system.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-600 transition focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleNavigation = (href: string, allowedRoles: string[]) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!allowedRoles.includes(user.role)) {
      showError('You do not have access to this page');
      return;
    }
    
    router.push(href);
  };
  
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
    router.push('/login');
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Don't show sidebar on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col z-40">
        <div className="flex items-center gap-3 p-6 border-b">
          <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">KO</div>
          <div>
            <div className="font-bold text-xl">Kasali Oloshe</div>
            <div className="text-xs text-gray-500">Inventory Management</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ name, href, icon: Icon, roles, viewableBy }) => {
            const hasAccess = user && roles.includes(user.role);
            const canViewInSidebar = !viewableBy || (user && roles.includes(user.role));
            
            return (
              <button
                key={name}
                onClick={() => handleNavigation(href, roles)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded hover:bg-gray-100 transition ${
                  pathname === href ? "bg-blue-100 text-blue-600" : "text-gray-700"
                } ${!canViewInSidebar ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!canViewInSidebar}
                title={!canViewInSidebar ? 'Access restricted - viewable from other pages only' : ''}
              >
                <div className="flex items-center">
                  <Icon className={`mr-3 h-5 w-5 ${pathname === href ? 'text-blue-600' : 'text-gray-500'}`} />
                  {name}
                </div>
                {!canViewInSidebar && <LockIcon className="h-4 w-4 text-gray-400" />}
              </button>
            );
          })}
        </nav>
        {/* User Info & Logout at bottom */}
        {user && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-xs text-gray-500 uppercase">
                  {user.role}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition group"
            >
              <div className="p-1.5 bg-red-50 rounded-lg group-hover:bg-red-100 transition mr-3">
                <LogOut className="h-4 w-4 text-red-600" />
              </div>
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
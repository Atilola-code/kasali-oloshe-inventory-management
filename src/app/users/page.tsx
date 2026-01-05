"use client";
import { useEffect, useRef, useState } from "react";
import { Shield, Users, UserPlus, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import RegisterModal from "../components/auth/RegisterModal";
import RoleProtectedRoute from "../components/auth/RoleProtectedRoute";
import { showError, showSuccess } from "../utils/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

interface RoleStats {
  admin: number;
  manager: number;
  cashier: number;
}

export default function UserManagementPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [roleStats, setRoleStats] = useState<RoleStats>({
    admin: 0,
    manager: 0,
    cashier: 0,
  });
  const [loading, setLoading] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if click is outside all dropdown menus
      const clickedOutside = Object.values(dropdownRefs.current).every(
        ref => !ref || !ref.contains(event.target as Node)
      );
      
      if (clickedOutside) {
        setActiveMenu(null);
      }
    }
    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function validateToken(): Promise<boolean> {
  const token = localStorage.getItem("access_token");
  if (!token) return false;
  
  try {
    const res = await fetch(`${API_URL}/api/users/`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });
    
    // If we get anything other than 401, token is valid
    return res.status !== 401;
  } catch {
    return false;
  }
}

  async function fetchUsers() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      console.log("Token:", token ? "Exists" : "Missing");

      if (!token) {
        showError("You need to log in first");
        // Redirect to login or show login modal
        return;
      }

      console.log("Testing token...");

      const res = await fetch(`${API_URL}/api/users/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      console.log("Response status:", res.status);

      if (res.status === 401) {
        // Token expired or invalid
        showError("Your session has expired. Please log in again.");
        localStorage.clear();
        window.location.href = "/login";
        return;
      }

      if (res.ok) {
        const data: User[] = await res.json();
        setUsers(data);
        
        // Calculate role statistics
        const stats = data.reduce((acc, user) => {
          if (user.role === 'ADMIN') acc.admin++;
          else if (user.role === 'MANAGER') acc.manager++;
          else if (user.role === 'CASHIER') acc.cashier++;
          return acc;
        }, { admin: 0, manager: 0, cashier: 0 });
        
        setRoleStats(stats);
      } else {
        console.error("Failed to fetch users:", res.status);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleUserAdded() {
    setRegisterModalOpen(false);
    fetchUsers(); // Refresh the user list
  }

  async function handleDeleteUser(userId: number) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/users/${userId}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (res.ok || res.status === 204) {
        // Show success message
        showSuccess("User deleted successfully!");
        
        // Update local state to remove the user immediately
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        
        // Update role stats
        const deletedUser = users.find(user => user.id === userId);
        if (deletedUser) {
          setRoleStats(prevStats => {
            const newStats = {...prevStats};
            if (deletedUser.role === 'ADMIN') newStats.admin--;
            else if (deletedUser.role === 'MANAGER') newStats.manager--;
            else if (deletedUser.role === 'CASHIER') newStats.cashier--;
            return newStats;
          });
        }
      } else {
        // Try to get error message from response
        try {
          const errorData = await res.json();
          showError(`Failed to delete user: ${errorData.detail || errorData.message || 'Unknown error'}`);
        } catch {
          showError(`Failed to delete user: HTTP ${res.status}`);
        }
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      showError(`Error deleting user: ${error.message || 'Network error'}`);
    } finally {
      setActiveMenu(null);
    }
  }

  async function handleEditUser(user: User) {
    // Implement edit functionality
    console.log("Edit user:", user);
    setEditingUser(user);
    // You can open an edit modal here
    showSuccess(`Edit functionality for ${user.first_name} ${user.last_name} - Coming soon!`);
    setActiveMenu(null);
  }

  const handleMoreClick = (userId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setActiveMenu(activeMenu === userId ? null : userId);
  };

  const filteredUsers = users.filter((user) =>
    user.first_name.toLowerCase().includes(query.toLowerCase()) ||
    user.last_name.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase())
  );

  const roleCards = [
    {
      role: 'Admin',
      icon: Shield,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-500',
      count: roleStats.admin,
      access: 'Full System Access',
    },
    {
      role: 'Manager',
      icon: Users,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-500',
      count: roleStats.manager,
      access: 'Manage, Create & View',
    },
    {
      role: 'Cashier',
      icon: UserPlus,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-500',
      count: roleStats.cashier,
      access: 'Create & View',
    },
  ];

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <div className="h-screen bg-gray-50 flex">
          <Sidebar />
          <div className="ml-64 flex-1 flex flex-col">
            <Topbar query={query} setQuery={setQuery} />
            
            {/* Fixed Header Section */}
            <div className="flex-shrink-0 pt-20 px-6 bg-gray-50">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                  <p className="text-gray-600 mt-1">Manage users and system access permissions</p>
                </div>
                <button
                  onClick={() => setRegisterModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium shadow-sm transition"
                >
                  <UserPlus size={20} />
                  Add User
                </button>
              </div>

              {/* Role Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {roleCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.role}
                      className={`bg-white rounded-t-xl shadow-sm border border-gray-200 overflow-hidden border-b-4 ${card.borderColor}`}
                    >
                      <div className={`${card.bgColor} p-6`}>
                        <div className="flex items-center gap-3 mb-4">
                          <Icon className={card.iconColor} size={24} />
                          <h3 className={`text-xl font-bold ${card.iconColor}`}>
                            {card.role}
                          </h3>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-2xl font-bold text-gray-900">
                            {card.count} <span className="text-sm font-normal text-gray-600">user(s)</span>
                          </p>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                            Access Rights
                          </p>
                          <p className="text-sm font-medium text-gray-700">
                            {card.access}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table Header */}
              <div className="bg-white rounded-t-xl shadow-sm border border-gray-200 mb-0">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">All Users</h2>
                </div>
              </div>
            </div>

            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-hidden px-6 pb-6 bg-gray-50">
              <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 h-full overflow-hidden">
                <div className="overflow-x-auto h-full">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            Loading users...
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                  {user.first_name[0]}{user.last_name[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {user.phone || '—'}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.role === 'ADMIN'
                                    ? 'bg-orange-100 text-orange-700'
                                    : user.role === 'MANAGER'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end relative">
                                <button 
                                  onClick={(e) => handleMoreClick(user.id, e)}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                  <MoreVertical size={20} />
                                </button>
                                
                                {/* Dropdown Menu */}
                                {activeMenu === user.id && (
                                  <div 
                                    ref={(el) => {
                                      dropdownRefs.current[user.id] = el;
                                    }}
                                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={() => handleEditUser(user)}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        <Edit size={16} className="mr-3" />
                                        Edit User
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 size={16} className="mr-3" />
                                        Delete User
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <RegisterModal
          open={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          onSuccess={handleUserAdded}
        />
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}
// src/app/components/auth/SignupPage.tsx
"use client";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react'

export default function SignupPage({onClose} : {onClose: () => void}) {
    const { register } = useAuth();
    const [data, setData] = useState({
        first_name: '',
        last_name: '', 
        email: '', 
        password: '', 
        confirm_password: '', 
        phone: '', 
        role: 'CASHIER'
    });
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        if (data.password !== data.confirm_password) {
        setError('Passwords do not match');
        return;
        }
        setLoading(true);
        try {
            await register(data);
            setSuccess(true);
            setTimeout(onClose, 2000);
          } catch (err: any) {
            setError(err.message || 'Registration failed');
          } finally {
            setLoading(false);
        }
};

if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h3 className="text-2xl font-bold">User Created!</h3>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Register New User</h2>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name *</label>
              <input value={data.first_name} onChange={(e) => setData({...data, first_name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Last Name *</label>
              <input value={data.last_name} onChange={(e) => setData({...data, last_name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input type="email" value={data.email} onChange={(e) => setData({...data, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input value={data.phone} onChange={(e) => setData({...data, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" placeholder="08012345678" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role *</label>
            <select value={data.role} onChange={(e) => setData({...data, role: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Password *</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={data.password} onChange={(e) => setData({...data, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg pr-12" />
                <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password *</label>
              <input type={showPwd ? 'text' : 'password'} value={data.confirm_password} onChange={(e) => setData({...data, confirm_password: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={onClose} className="px-6 py-2 border rounded-lg" disabled={loading}>Cancel</button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

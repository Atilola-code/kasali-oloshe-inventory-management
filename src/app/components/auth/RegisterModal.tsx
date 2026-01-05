// src/app/components/auth/RegisterModal.tsx
'use client'
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/app/utils/toast';


type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type RegisterFormData = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
  phone?: string;
};

export default function RegisterModal({ open, onClose, onSuccess }: Props) {
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<RegisterFormData>();
  const [error, setError] = useState('');

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    try {
      await registerUser(data);
      reset();
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      showError(err.message || 'Registration failed');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Register New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                {...register('first_name', { required: 'First name is required' })}
                className="w-full px-3 py-2 border rounded"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                {...register('last_name', { required: 'Last name is required' })}
                className="w-full px-3 py-2 border rounded"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input
              type="password"
              {...register('confirm_password', { required: 'Confirm password is required', validate: (value) => value === watch('password') || 'Passwords do not match' })}
              className="w-full px-3 py-2 border rounded"
            />
            {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role *</label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select Role</option>
              <option value="CASHIER">Cashier</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              {...register('phone')}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
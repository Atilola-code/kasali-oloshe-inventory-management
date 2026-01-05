// src/app/components/products/AddProductModal.tsx
'use client'
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { showSuccess, showError } from "@/app/utils/toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onProductAdded: () => void;
  lastProductSku?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CATEGORY_OPTIONS = [
  { value: 'bath soap', label: 'Bath Soap' },
  { value: 'liquid detergent', label: 'Liquid Detergent' },
  { value: 'detergent', label: 'Detergent' },
  { value: 'others', label: 'Others' }
];

export default function AddProductModal({ open, onClose, onProductAdded, lastProductSku }: Props) {
  const { register, handleSubmit, reset, setValue, formState:{isSubmitting, errors} } = useForm<any>();

  // Auto-generate SKU when modal opens
  useEffect(() => {
    if (open) {
      const generateNextSku = (sku: string | undefined): string => {
        // If no SKU exists (first product), start with PRD-001
        if (!sku || sku.trim() === '') {
          return 'PRD-001';
        }
        
        // Check if SKU is numeric
        if (/^\d+$/.test(sku)) {
          const num = parseInt(sku, 10);
          return (num + 1).toString().padStart(sku.length, '0');
        }
        
        // Check if SKU has numeric suffix (e.g., "PRD-001")
        const match = sku.match(/(.*?)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2], 10);
          const suffix = (num + 1).toString().padStart(match[2].length, '0');
          return prefix + suffix;
        }
        
        // If no pattern found, append "-001"
        return `${sku}-001`;
      };

      const nextSku = generateNextSku(lastProductSku);
      setValue("sku", nextSku);
    }
  }, [open, lastProductSku, setValue]);

  async function onSubmit(data: any) {
    try {
     console.log("Submitting product:", data)
     const token = localStorage.getItem("access_token");
     const res = await fetch(`${API_URL}/api/inventory/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        showError(`Failed to create product: ${res.status}`);
        return;
      }

      const responseData = await res.json();
      console.log("Response:", responseData);
      
      await onProductAdded();
      reset();
      onClose();
      showSuccess("Product added successfully!");
    } catch (err) {
      console.error("Error adding product:", err);
      showError("Failed to add product");
    }
  }

  if (!open) return null;

  return (
    <div className={`fixed inset-0 bg-black/40 flex items-center justify-center ${open ? "" : "pointer-events-none opacity-0"}`}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 mt-36">
        <h3 className="text-lg font-semibold mb-4">Add Product</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input 
                {...register("sku", {required: "SKU is required"})} 
                placeholder="SKU" 
                className="border p-2 rounded w-full bg-gray-50" 
                required 
                disabled={isSubmitting}
                readOnly
                title="SKU is auto-generated"
              />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message as string}</p>}
            </div>
            <div>
              <input 
                {...register("name", { required: "Product name is required"})} 
                placeholder="Product name" 
                className="border p-2 rounded w-full" 
                required 
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <select
                {...register("category", { required: "Category is required" })} 
                className="border p-2 rounded w-full" 
                defaultValue=""
                disabled={isSubmitting}
              >
                <option value="" disabled>Select category</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message as string}</p>}
            </div>
            <div>
              <input 
                type="number"
                {...register("quantity", 
                { valueAsNumber: true,
                min: { value: 0, message: "Quantity cannot be negative" }
                })} 
                placeholder="Quantity"
                className="border p-2 rounded w-full" 
                defaultValue={0} 
                disabled={isSubmitting}
              />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message as string}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input 
                type="number" 
                step="0.01" 
                {...register("selling_price", { 
                valueAsNumber: true,
                required: "Selling price is required", 
                min: { value: 0, message: "Selling price cannot be negative" }
                })} 
                placeholder="Selling price" 
                className="border p-2 rounded w-full" 
                required 
                disabled={isSubmitting} 
              />
              {errors.selling_price && <p className="text-red-500 text-xs mt-1">{errors.selling_price.message as string}</p>}
            </div>
            <div>
              <input 
                type="number" 
                step="0.01" 
                {...register("cost_price", { 
                  valueAsNumber: true,
                  min: { value: 0, message: "Cost price cannot be negative" }
                })}
                placeholder="Cost price" 
                className="border p-2 rounded w-full" 
                disabled={isSubmitting}
              />
              {errors.cost_price && <p className="text-red-500 text-xs mt-1">{errors.cost_price.message as string}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded border" 
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded bg-blue-600 text-white" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
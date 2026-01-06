'use client'
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Product } from "@/app/types";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api"; 

type Props = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onProductUpdated: () => void;
};


// Define category options (same as AddProductModal)
const CATEGORY_OPTIONS = [
  { value: 'bath soap', label: 'Bath Soap' },
  { value: 'liquid detergent', label: 'Liquid Detergent' },
  { value: 'detergent', label: 'Detergent' },
  { value: 'others', label: 'Others' }
];

export default function EditProductModal({ open, onClose, product, onProductUpdated }: Props) {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<any>();

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        selling_price: product.selling_price,
        cost_price: product.cost_price || "",
        low_stock_threshold: product.low_stock_threshold || 100,
      });
    }
  }, [product, reset]);

  async function onSubmit(data: any) {
    if (!product) return;

    try {
      const token = localStorage.getItem("access_token");
      const res = await apiFetch(`/api/inventory/${product.id}/`, {
        method: "PATCH",
        
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        showError(`Failed to update product: ${res.status}`);
        return;
      }

      await onProductUpdated();
      onClose();
      showSuccess("Product updated successfully!");
    } catch (err) {
      console.error("Error updating product:", err);
      showError("Failed to update product");
    }
  }

  if (!open || !product) return null;

  return (
    <div className={`fixed inset-0 bg-black/40 flex items-center justify-center ${open ? "" : "pointer-events-none opacity-0"}`}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Product</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input 
                {...register("sku", {required: "SKU is required"})} 
                placeholder="SKU" 
                className="border p-2 rounded w-full" 
                disabled={isSubmitting}
              />
              {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message as string}</p>}
            </div>
            <div>
              <input 
                {...register("name", { required: "Product name is required"})} 
                placeholder="Product name" 
                className="border p-2 rounded w-full" 
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
                disabled={isSubmitting}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option 
                    key={option.value} 
                    value={option.value}
                    selected={product?.category === option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message as string}</p>}
            </div>
            <div>
              <input 
                type="number" 
                {...register("quantity", { 
                  valueAsNumber: true,
                  min: { value: 0, message: "Quantity cannot be negative" }
                })} 
                placeholder="Quantity" 
                className="border p-2 rounded w-full" 
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
                  min: { value: 0, message: "Price cannot be negative" }
                })} 
                placeholder="Selling price" 
                className="border p-2 rounded w-full" 
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
                  min: { value: 0, message: "Cost cannot be negative" }
                })} 
                placeholder="Cost price" 
                className="border p-2 rounded w-full" 
                disabled={isSubmitting}
              />
              {errors.cost_price && <p className="text-red-500 text-xs mt-1">{errors.cost_price.message as string}</p>}
            </div>
          </div>
          
          <div>
            <input 
              type="number" 
              {...register("low_stock_threshold", { 
                valueAsNumber: true,
                min: { value: 1, message: "Threshold must be at least 1" }
              })} 
              placeholder="Low stock threshold" 
              className="border p-2 rounded w-full" 
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this number</p>
            {errors.low_stock_threshold && <p className="text-red-500 text-xs mt-1">{errors.low_stock_threshold.message as string}</p>}
          </div>
          
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 rounded border hover:bg-gray-50 transition" 
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// src/app/components/sales/EditSaleModal.tsx
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Product } from "@/app/types";
import { showError, showSuccess } from "@/app/utils/toast";
import { Search, ChevronDown, Check, X } from "lucide-react";
import { apiFetch } from "@/services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  products: Product[];
  saleId: number;
  onSaleUpdated: () => void;
};



export default function EditSaleModal({ open, onClose, products, saleId, onSaleUpdated }: Props) {
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});
  
  const { register, handleSubmit, watch, reset, setValue } = useForm<any>({
    defaultValues: {
      items: [{ product: "", quantity: 1, price: 0 }],
      customer_name: "",
      payment_method: "cash"
    }
  });
  
  const items = watch("items") || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      Object.keys(dropdownOpen).forEach(key => {
        const idx = parseInt(key);
        if (dropdownOpen[idx] && dropdownRefs.current[idx] && 
            !dropdownRefs.current[idx]?.contains(event.target as Node)) {
          setDropdownOpen(prev => ({ ...prev, [idx]: false }));
        }
      });
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (open && saleId) {
      fetchSaleData();
    }
  }, [open, saleId]);

  async function fetchSaleData() {
    try {
      const res = await apiFetch('/api/sales/', {
      });

      if (res.ok) {
        const data = await res.json();
        const sale = data.find((s: any) => s.id === saleId);

        if (sale) {
          const productIdMap: Record<number, string> = {};
          const formItems = sale.items.map((item: any, index: number) => {
            const product = products.find(p => p.name === item.product_name);
            if (product) {
              productIdMap[index] = product.id.toString();
            }
            return {
              product: item.product_name,
              quantity: item.quantity,
              price: item.unit_price
            };
          });

          setSelectedProductIds(productIdMap);
          reset({
            customer_name: sale.customer_name || "",
            payment_method: sale.payment_method,
            items: formItems
          });
        }
      }
    } catch (error) {
      console.error("Error fetching sale:", error);
      showError("Failed to load sale data");
    }
  }

  function handleProductChange(index: number, productId: string) {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      setSelectedProductIds(prev => ({
        ...prev,
        [index]: productId
      }));
      setValue(`items.${index}.product`, product.name);
      setValue(`items.${index}.price`, product.selling_price);
      setDropdownOpen(prev => ({ ...prev, [index]: false }));
      setSearchTerms(prev => ({ ...prev, [index]: "" }));
    }
  }

  function toggleDropdown(index: number) {
    setDropdownOpen(prev => ({ ...prev, [index]: !prev[index] }));
    if (!dropdownOpen[index]) {
      setTimeout(() => {
        const searchInput = document.getElementById(`edit-search-${index}`);
        if (searchInput) searchInput.focus();
      }, 10);
    }
  }

  function getProductName(productId: string) {
    const product = products.find(p => p.id.toString() === productId);
    return product ? `${product.sku} — ${product.name}` : "Select product";
  }

  function getFilteredProducts(index: number) {
    const searchTerm = searchTerms[index] || "";
    if (searchTerm.trim() === "") {
      return products;
    }
    
    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term)
    );
  }

  function clearSearch(index: number) {
    setSearchTerms(prev => ({ ...prev, [index]: "" }));
  }

  function removeProduct(index: number) {
    setSelectedProductIds(prev => {
      const newIds = { ...prev };
      delete newIds[index];
      return newIds;
    });
    setValue(`items.${index}.price`, 0);
    setValue(`items.${index}.product`, "");
  }

  function addLine() {
    const currentItems = watch("items");
    setValue("items", [...currentItems, { product: "", quantity: 1, price: 0 }]);
  }

  function removeLine(index: number) {
    if (items.length === 1) return;
    const currentItems = watch("items");

    const newSelectedIds = { ...selectedProductIds };
    delete newSelectedIds[index];

    Object.keys(newSelectedIds).forEach(key => {
      const numKey = parseInt(key);
      if (numKey > index) {
        newSelectedIds[numKey - 1] = newSelectedIds[numKey];
        delete newSelectedIds[numKey];
      }
    });

    setSelectedProductIds(newSelectedIds);
    setValue("items", currentItems.filter((_: any, i: number) => i !== index));
  }

  async function onSubmit(data: any) {
    const hasEmptyProducts = Object.keys(selectedProductIds).length !== items.length;
    if (hasEmptyProducts) {
      showError("Please select a product for all items");
      return;
    }

    const payload = {
      customer_name: data.customer_name || "Walk-in Customer",
      payment_method: data.payment_method,
      amount_paid: 0,
      items: items.map((it: any, idx: number) => {
        const productId = selectedProductIds[idx];
        const product = products.find(p => p.id.toString() === productId);
        return {
          product: product ? product.name : it.product,
          quantity: Number(it.quantity),
          unit_price: Number(it.price)
        };
      }),
    };

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        showError("Authentication required. Please log in again.");
        return;
      }

      const res = await apiFetch(`/api/sales/${saleId}/`, {
        method: "PUT",
        body: JSON.stringify(payload),
       
      });

      if (!res.ok) {
        const err = await res.json();
        let errorMessage = "Update failed";
        const errorDetails: string[] = [];

        if (err.items && Array.isArray(err.items)) {
          err.items.forEach((itemError: any, index: number) => {
            if (itemError.product && Array.isArray(itemError.product)) {
              errorDetails.push(`Item ${index + 1}: ${itemError.product[0]}`);
            } else if (itemError.product) {
              errorDetails.push(`Item ${index + 1}: ${itemError.product}`);
            }
          });
          errorMessage = errorDetails.join('; ');
        } else if (err.non_field_errors && Array.isArray(err.non_field_errors)) {
          errorMessage = err.non_field_errors[0];
        } else if (err.detail) {
          errorMessage = err.detail;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (typeof err === 'string') {
          errorMessage = err;
        }

        showError(errorMessage);
        throw new Error(errorMessage);
      }

      showSuccess("Sale updated successfully!");
      onSaleUpdated();
      setDropdownOpen({});
      setSearchTerms({});
      onClose();
    } catch (err) {
      console.error("Error updating sale:", err);
      showError(err instanceof Error ? err.message : "Failed to update sale");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto ml-16 mt-16 py-6 px-10">
        <h3 className="text-xl font-semibold mb-4">Edit Sale</h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              {...register("customer_name")}
              placeholder="Customer name (optional)"
              className="border p-2 rounded"
            />

            <select
              {...register("payment_method")}
              className="border p-2 rounded"
            >
              <option value="cash">Cash</option>
              <option value="transfer">Transfer</option>
              <option value="pos">POS</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-2 font-semibold text-sm text-gray-600 mb-2">
              <div className="col-span-2">Product</div>
              <div className="col-span-1">Quantity</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-1">Actions</div>
            </div>

            {items.map((_: any, idx: number) => {
              const selectedProductId = selectedProductIds[idx];
              const filteredProducts = getFilteredProducts(idx);
              
              return (
                <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                  {/* Custom Dropdown for Product Selection */}
                  <div className="col-span-2 relative" ref={(el) => { dropdownRefs.current[idx] = el; }}>
                    <button
                      type="button"
                      onClick={() => toggleDropdown(idx)}
                      className="w-full border p-2 rounded text-left flex items-center justify-between hover:bg-gray-50"
                    >
                      <span className="truncate">
                        {selectedProductId ? getProductName(selectedProductId) : "Select product"}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen[idx] ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {selectedProductId && (
                      <button
                        type="button"
                        onClick={() => removeProduct(idx)}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    
                    {dropdownOpen[idx] && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input inside Dropdown */}
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              id={`edit-search-${idx}`}
                              type="text"
                              placeholder="Search products..."
                              value={searchTerms[idx] || ""}
                              onChange={(e) => setSearchTerms(prev => ({ ...prev, [idx]: e.target.value }))}
                              className="w-full pl-8 pr-8 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              autoComplete="off"
                            />
                            {(searchTerms[idx] || "").trim() && (
                              <button
                                type="button"
                                onClick={() => clearSearch(idx)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Product List */}
                        <div className="overflow-y-auto max-h-48">
                          {filteredProducts.length === 0 ? (
                            <div className="p-3 text-center text-gray-500 text-sm">
                              No products found
                            </div>
                          ) : (
                            filteredProducts.map(product => {
                              const isSelected = selectedProductId === product.id.toString();
                              const isDisabled = Object.values(selectedProductIds).includes(product.id.toString()) && !isSelected;
                              
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => !isDisabled && handleProductChange(idx, product.id.toString())}
                                  disabled={isDisabled}
                                  className={`w-full text-left p-2 hover:bg-gray-100 flex items-center justify-between ${
                                    isSelected ? 'bg-blue-50 text-blue-700' : ''
                                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className="flex-1">
                                    <div className="font-medium">{product.sku} — {product.name}</div>
                                    <div className="text-xs text-gray-500">
                                      Stock: {product.quantity} | ₦{product.selling_price}
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    {...register(`items.${idx}.quantity`, {
                      valueAsNumber: true,
                      min: 1
                    })}
                    placeholder="Qty"
                    className="col-span-1 border p-2 rounded"
                  />

                  <input
                    type="number"
                    step="0.01"
                    {...register(`items.${idx}.price`, {
                      valueAsNumber: true,
                      min: 0
                    })}
                    placeholder="Price"
                    className="col-span-2 border p-2 rounded"
                    readOnly={!!selectedProductId}
                  />

                  {/* Hidden input for product name (sent to backend) */}
                  <input
                    type="hidden"
                    {...register(`items.${idx}.product`)}
                  />

                  <div className="col-span-1 flex gap-2">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="px-3 py-1 rounded-lg border text-sm hover:bg-red-50 hover:border-red-300"
                      >
                        Remove
                      </button>
                    )}
                    {idx === items.length - 1 && (
                      <button
                        type="button"
                        onClick={addLine}
                        className="px-6 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                reset({ items: [{ product: "", quantity: 1, price: 0 }], customer_name: "", payment_method: "cash" });
                setSelectedProductIds({});
                setDropdownOpen({});
                setSearchTerms({});
                onClose();
              }}
              className="px-4 py-2 rounded-[10px] border-2 hover:border-red-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded-[10px] bg-blue-600 text-white hover:bg-blue-700"
            >
              Update Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
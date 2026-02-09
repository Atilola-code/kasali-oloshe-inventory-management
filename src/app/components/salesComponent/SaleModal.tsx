// src/app/components/salesComponent/SaleModal.tsx - FIXED REAL-TIME TOTALS
import { useForm } from "react-hook-form";
import { Product, UserRole } from "@/app/types";
import { showError, showSuccess } from "@/app/utils/toast";
import { Search, ChevronDown, Check, X, DollarSign } from "lucide-react"; 
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { apiFetch } from "@/services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onSaleCompleted: (sale: any) => void;
  isSaleStopped: boolean;
  userRole: UserRole | null;
};

export default function SalesModal({ open, onClose, products, onSaleCompleted, isSaleStopped = false, userRole = null }: Props) {
  const { register, handleSubmit, watch, reset, setValue } = useForm<any>({
    defaultValues: { 
      items: [{ product: "", quantity: 1, price: 0 }], 
      customer_name: "", 
      payment_method: "cash",
      discount_amount: 0
    }
  });
  
  // ✅ FIX: Watch all form values for real-time calculation
  const items = watch("items") || [];
  const discountAmount = watch("discount_amount") || 0;
  
  const [selectedProductIds, setSelectedProductIds] = useState<Record<number, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const setDropdownRef = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    dropdownRefs.current[idx] = el;
  }, []);

  useEffect(() => {
    if (open && isSaleStopped && userRole !== 'ADMIN' && userRole !== 'MANAGER') {
      showError("Sales have been stopped by management. Please contact your supervisor.");
      onClose();
    }
  }, [open, isSaleStopped, userRole, onClose]);

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

  // ✅ FIX: REAL-TIME TOTALS CALCULATION - Recalculates whenever items, quantities, or discount changes
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    
    // Calculate subtotal from all items
    items.forEach((_: any, idx: number) => {
      const productId = selectedProductIds[idx];
      const product = products.find(p => p.id.toString() === productId);
      const quantity = parseFloat(items[idx]?.quantity) || 0;
      const price = parseFloat(items[idx]?.price) || 0;
      
      if (product && quantity > 0 && price > 0) {
        subtotal += quantity * price;
      }
    });

    const discount = Math.min(parseFloat(discountAmount.toString()) || 0, subtotal);
    const total = subtotal - discount;

    return {
      subtotal,
      discountAmount: discount,
      total
    };
  }, [items, selectedProductIds, products, discountAmount]);

  function handleProductChange(index: number, productId: string) {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      setSelectedProductIds(prev => ({ ...prev, [index]: productId }));
      setValue(`items.${index}.price`, product.selling_price);
      setDropdownOpen(prev => ({ ...prev, [index]: false }));
      setSearchTerms(prev => ({ ...prev, [index]: "" }));
    }
  }

  function toggleDropdown(index: number) {
    setDropdownOpen(prev => ({ ...prev, [index]: !prev[index] }));
    if (!dropdownOpen[index]) {
      setTimeout(() => {
        const searchInput = document.getElementById(`search-${index}`);
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
    if (searchTerm.trim() === "") return products;
    
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

    setSubmitting(true);

    try {
      const saleItems = items.map((it: any, index: number) => {
        const productId = selectedProductIds[index];
        const product = products.find(p => p.id.toString() === productId);
        
        if (!product) {
          throw new Error(`Product not found for item ${index + 1}`);
        }
        
        return {
          product: parseInt(productId),
          quantity: Number(it.quantity),
          unit_price: Number(it.price)
        };
      });

      const payload = {
        customer_name: data.customer_name || "Walk-in Customer",
        payment_method: data.payment_method,
        amount_paid: 0,
        discount_amount: parseFloat(data.discount_amount) || 0,
        items: saleItems
      };

      console.log("📤 Submitting sale payload:", payload);

      const res = await apiFetch('/api/sales/', {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        
        if (err.items) {
          const itemErrors = Object.entries(err.items)
            .map(([key, value]: [string, any]) => {
              return `${key}: ${Array.isArray(value) ? value[0] : value}`;
            })
            .join('; ');
          showError(`Item errors: ${itemErrors}`);
        } else if (err.non_field_errors) {
          showError(err.non_field_errors.join(', '));
        } else if (err.detail) {
          showError(err.detail);
        } else if (err.error) {
          showError(err.error);
        } else {
          showError(`Failed to complete sale: ${res.status} ${res.statusText}`);
        }
        return;
      }

      const sale = await res.json();
      
      showSuccess("Sale completed successfully!");
      reset({ 
        items: [{ product: "", quantity: 1, price: 0 }], 
        customer_name: "", 
        payment_method: "cash", 
        discount_amount: 0
      });
      setSelectedProductIds({});
      setDropdownOpen({});
      setSearchTerms({});
      onSaleCompleted(sale);
      onClose();
    } catch (err: any) {
      console.error("❌ Error recording sale:", err);
      showError(err.message || "Sales record failed. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl h-[80vh] flex flex-col ml-16">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <h3 className="text-xl font-semibold">Record Sale</h3>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <input
              {...register("customer_name")}
              placeholder="Customer name (optional)"
              className="border p-2 rounded w-full"
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

            <input
              type="number"
              step="0.01"
              min="0"
              {...register("discount_amount")}
              placeholder="Discount Amount ₦ (optional)"
              className="border p-2 rounded w-full"
            />
          </div>
        </div>

        {/* Scrollable Products Section */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-6">
            <form onSubmit={handleSubmit(onSubmit)} id="sale-form">
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2 font-semibold text-sm text-gray-600 mb-2 sticky top-0 bg-white py-2">
                  <div className="col-span-2">Product</div>
                  <div className="col-span-1">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-1">Actions</div>
                </div>

                {items.map((_: any, idx: number) => {
                  const selectedProductId = selectedProductIds[idx];
                  const filteredProducts = getFilteredProducts(idx);
                  
                  return (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center mb-4">
                      <div className="col-span-2 relative" ref={setDropdownRef(idx)}>
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
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-hidden">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  id={`search-${idx}`}
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
                            
                            <div className="overflow-y-auto max-h-48">
                              {filteredProducts.length === 0 ? (
                                <div className="p-3 text-center text-gray-500 text-sm">No products found</div>
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
                        {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                        placeholder="Qty"
                        className="col-span-1 border p-2 rounded"
                        min={1}
                      />

                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${idx}.price`, { valueAsNumber: true })}
                        placeholder="Price"
                        className="col-span-2 border p-2 rounded"
                        readOnly={!!selectedProductId}
                      />

                      <div className="col-span-1 flex gap-2">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="px-3 py-2 rounded-lg border text-sm hover:bg-red-50 hover:border-red-300"
                          >
                            Remove
                          </button>
                        )}
                        {idx === items.length - 1 && (
                          <button
                            type="button"
                            onClick={addLine}
                            className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          </div>
        </div>

        {/* ✅ LIVE TOTALS DISPLAY */}
        <div className="flex-shrink-0 border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-600">Subtotal: </span>
                <span className="font-semibold text-gray-900">₦{formatCurrency(calculatedTotals.subtotal)}</span>
              </div>
              {calculatedTotals.discountAmount > 0 && (
                <div>
                  <span className="text-gray-600">Discount: </span>
                  <span className="font-semibold text-red-600">-₦{formatCurrency(calculatedTotals.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-gray-600">Total: </span>
                <span className="font-bold text-green-700 text-lg">₦{formatCurrency(calculatedTotals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t p-6">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                reset({ 
                  items: [{ product: "", quantity: 1, price: 0 }], 
                  customer_name: "", 
                  payment_method: "cash", 
                  discount_amount: 0 
                });
                setSelectedProductIds({});
                setDropdownOpen({});
                setSearchTerms({});
                onClose();
              }}
              className="px-4 py-2 rounded-[10px] border-2 hover:border-red-300"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="sale-form"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting || calculatedTotals.total <= 0}
              className={`px-3 py-2 rounded-[10px] text-white text-sm font-medium ${
                submitting || calculatedTotals.total <= 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/app/components/purchaseOrders/CreatePOModal.tsx
"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { X, Trash2, Package, Search, Check, ChevronDown } from "lucide-react";
import { showSuccess, showError } from "@/app/utils/toast";
import { Product } from "@/app/types";
import { apiFetch } from "@/services/api";


interface CreatePOModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onPOCreated: () => void;
}

interface POItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export default function CreatePOModal({ open, onClose, products, onPOCreated }: CreatePOModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: "",
    expected_delivery: "",
    notes: "",
    status: "draft" as "draft" | "pending"
  });
  const [items, setItems] = useState<POItem[]>([{ product_id: 0, quantity: 1, unit_price: 0 }]);
  const [selectedProducts, setSelectedProducts] = useState<Record<number, number>>({});
  const [dropdownOpen, setDropdownOpen] = useState<Record<number, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const setDropdownRef = useCallback((idx: number) => (el: HTMLDivElement | null) => {
    dropdownRefs.current[idx] = el;
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: 'quantity' | 'unit_price', value: string | number) => {
    const newItems = [...items];
    
    if (field === 'quantity') {
        // If value is empty string, set to 0 (temporary)
        if (value === '') {
            newItems[index] = { ...newItems[index], [field]: 0 };
        } else {
           const numValue = typeof value === 'string' ? parseInt(value) : value;
        // Only update if it's a valid positive number
            if (!isNaN(numValue)) {
                newItems[index] = { 
                ...newItems[index], 
                [field]: numValue > 0 ? numValue : 1 
                };
            }
        }
    } else if (field === 'unit_price') {
        // If value is empty string, set to 0 (temporary)
        if (value === '') {
            newItems[index] = { ...newItems[index], [field]: 0 };
        } else {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
        // Only update if it's a valid number
        if (!isNaN(numValue)) {
         newItems[index] = { 
            ...newItems[index], 
            [field]: numValue >= 0 ? numValue : 0 
            };
        }
        }
    }
    
    setItems(newItems);
    };

  const handleProductSelect = (index: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    console.log('Selecting product:', { index, productId, product }); // Debug log
  
    if (product) {
        // Create a new items array to properly update state
         const newItems = [...items];
        newItems[index] = { 
            ...newItems[index], 
            product_id: productId,
            unit_price: product.cost_price || 0 
        };
        setItems(newItems);
    
        // Update selected products
        setSelectedProducts(prev => ({ ...prev, [index]: productId }));
        setDropdownOpen(prev => ({ ...prev, [index]: false }));
        setSearchTerms(prev => ({ ...prev, [index]: "" }));
    
        console.log('Updated item:', newItems[index]); // Debug log
       }
    };

  const addItem = () => {
    setItems([...items, { product_id: 0, quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    
    const newSelected = { ...selectedProducts };
    delete newSelected[index];
    setSelectedProducts(newSelected);
  };

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.sku} — ${product.name}` : "Select product";
  };

  const getFilteredProducts = (index: number) => {
    const searchTerm = searchTerms[index] || "";
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term)
    );
  };

  const calculateTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Items array:', items);
    console.log('Selected products:', selectedProducts);
  
  // Check each item
    items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        isValid: !(!item.product_id || item.quantity <= 0 || item.unit_price <= 0)
        });
    });

    if (!formData.supplier_name.trim()) {
      showError("Please enter supplier name");
      return;
    }

    if (!formData.expected_delivery) {
      showError("Please select expected delivery date");
      return;
    }

    const hasInvalidItems = items.some(item => {
        // Check if product is selected
        if (!item.product_id) return true;
        
        // Check if quantity is valid (greater than 0)
        if (item.quantity <= 0) return true;
        
        // Check if unit price is valid (greater than 0)
        if (item.unit_price <= 0) return true;
        
        return false;
    });
  
  console.log('hasInvalidItems:', hasInvalidItems);

  if (hasInvalidItems) {
    showError("Please complete all product details");
    return;
  }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      
      const payload = {
        supplier_name: formData.supplier_name,
        expected_delivery: formData.expected_delivery,
        notes: formData.notes,
        status: formData.status,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price)
        }))
      };

      const response = await apiFetch('/api/purchase-orders/', {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showSuccess("Purchase order created successfully!");
        onPOCreated();
        handleClose();
      } else {
        const errorData = await response.json();
        showError(errorData.detail || "Failed to create purchase order");
      }
    } catch (error: any) {
      console.error("Error creating PO:", error);
      showError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      supplier_name: "",
      expected_delivery: "",
      notes: "",
      status: "draft"
    });
    setItems([{ product_id: 0, quantity: 1, unit_price: 0 }]);
    setSelectedProducts({});
    setDropdownOpen({});
    setSearchTerms({});
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Create Purchase Order</h2>
              <p className="text-sm text-gray-600">Add new purchase order</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Supplier and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleChange}
                  placeholder="Enter supplier name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery *
                </label>
                <input
                  type="date"
                  name="expected_delivery"
                  value={formData.expected_delivery}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Products Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Products *
              </label>
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const selectedProductId = selectedProducts[idx];
                  const filteredProducts = getFilteredProducts(idx);
                  
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start bg-gray-50 p-3 rounded-lg">
                      {/* Product Dropdown */}
                      <div className="col-span-5 relative" ref={setDropdownRef(idx)}>
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className="w-full border border-gray-300 p-2 rounded-lg text-left flex items-center justify-between hover:bg-white"
                        >
                          <span className="truncate text-sm">
                            {selectedProductId ? getProductName(selectedProductId) : "Select product"}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen[idx] ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {dropdownOpen[idx] && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                            <div className="p-2 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  type="text"
                                  placeholder="Search products..."
                                  value={searchTerms[idx] || ""}
                                  onChange={(e) => setSearchTerms(prev => ({ ...prev, [idx]: e.target.value }))}
                                  className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                            
                            <div className="overflow-y-auto max-h-48">
                              {filteredProducts.length === 0 ? (
                                <div className="p-3 text-center text-gray-500 text-sm">
                                  No products found
                                </div>
                              ) : (
                                filteredProducts.map(product => {
                                  const isSelected = selectedProductId === product.id;
                                  const isDisabled = Object.values(selectedProducts).includes(product.id) && !isSelected;
                                  
                                  return (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => !isDisabled && handleProductSelect(idx, product.id)}
                                      disabled={isDisabled}
                                      className={`w-full text-left p-2 hover:bg-gray-100 flex items-center justify-between ${
                                        isSelected ? 'bg-blue-50 text-blue-700' : ''
                                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{product.sku} — {product.name}</div>
                                        <div className="text-xs text-gray-500">
                                          Stock: {product.quantity} | Cost: ₦{product.cost_price}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                        <div className="col-span-2">
                        <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity === 0 ? '' : item.quantity} 
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                            min="1"
                        />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-3">
                        <input
                            type="number"
                            placeholder="Unit Price"
                            value={item.unit_price === 0 ? '' : item.unit_price} // Show empty when 0
                            onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                            step="0.01"
                            min="0"
                            className="w-full border border-gray-300 p-2 rounded-lg text-sm"
                        />
                        </div>

                      {/* Actions */}
                      <div className="col-span-2 flex gap-1">
                        {idx === items.length - 1 && (
                          <button
                            type="button"
                            onClick={addItem}
                            className="flex-1 px-2 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm"
                            title="Add item"
                          >Add
                            
                          </button>
                        )}
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="flex-1 px-2 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter any additional notes"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Order Summary</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Total Items:</span>
                  <span className="font-medium text-blue-700">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Total Amount:</span>
                  <span className="font-medium text-blue-700">₦{calculateTotalAmount().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
         {/* Add this temporarily in your modal JSX */}
         <button 
            type="button" 
            onClick={() => {
              console.log('Current state:', { items, selectedProducts });
              items.forEach((item, i) => {
              console.log(`Item ${i}:`, item, 'Valid:', !(!item.product_id || item.quantity <= 0 || item.unit_price <= 0));
              });
            }}
            className="px-4 py-2 bg-gray-200 rounded-xl"
            >
            Debug State
           </button>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Complete PO"}
          </button>
        </div>
      </div>
    </div>
  );
}
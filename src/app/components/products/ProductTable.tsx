// src/app/components/products/ProductTable.tsx
"use client";
import React, { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Product } from "@/app/types";

type Props = {
  products: Product[];
  query: string;
  setQuery: (q: string) => void;
  onAddProduct: () => void;
  onRecordSale: () => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: number) => void;
};

export default function ProductTable({ products, query, setQuery, onAddProduct, onRecordSale, onEditProduct, onDeleteProduct }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState<number | null>(null);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase())
  );

  const statusBadge = (p: Product) => {
    if (p.quantity <= 0) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-red-800">🔴 Out of stock</span>;
    if (p.quantity <= 100) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium  text-yellow-600">🟡 Low stock</span>;
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium  text-green-800">🟢 In stock</span>;
  };

  const handleEdit = (product: Product) => {
    setDropdownOpen(null);
    if (onEditProduct) {
      onEditProduct(product);
    } else {
      console.log("Edit product:", product);
    }
  }

  const handleDelete = (productId: number, productName: string) => {
    setDropdownOpen(null);
    if (onDeleteProduct) {
      if (window.confirm(`Are you sure you want to delete product "${productName}"? This action cannot be undone.`)) {
        onDeleteProduct(productId);
      }
    } else {
      console.log("Delete product:", productId);
    }
  };

  const toggleDropdown = (productId: number) => {
    setDropdownOpen(dropdownOpen === productId ? null : productId);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };

    if (dropdownOpen !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }
  }, [dropdownOpen]);

  const formatCategory = (category: string) => {
    const categoryMap: Record<string, string> = {
      'bath soap': 'Bath Soap',
      'liquid detergent': 'Liquid Detergent',
      'detergent': 'Detergent',
      'others': 'Others'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="bg-white rounded shadow">
      {/* Fixed Header Section */}
      <div className="sticky top-20 bg-white border-b z-30 pt-8 pb-4 px-6"> {/* top-20 matches the pt-20 in main */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold mb-2">Products & Inventory</h3>
            <p className="text-sm text-gray-600">Manage your product catalogs and stock levels.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name, SKU, category"
              className="border p-2 rounded w-80"
            />
            <button onClick={onAddProduct} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              Add product
            </button>
            <button onClick={onRecordSale} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
              Record sale
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Table Content */}
      <div className="overflow-x-auto max-h-[calc(100vh-216px)]">
        <table className="w-full mt-2 table-auto border-collapse">
          <thead className="sticky top-0 bg-white z-20">
            <tr className="text-left text-md text-gray-600 border-b">
              <th className="py-4 px-6 bg-white">SKU</th>
              <th className="py-4 px-6 bg-white">Product</th>
              <th className="py-4 px-6 bg-white">Category</th>
              <th className="py-4 px-6 bg-white">Stock</th>
              <th className="py-4 px-6 bg-white">Price</th>
              <th className="py-4 px-6 bg-white">Cost</th>
              <th className="py-4 px-6 bg-white">Status</th>
              <th className="py-4 px-6 bg-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="py-4 px-6 text-sm">{p.sku}</td>
                <td className="py-4 px-6 text-sm">{p.name}</td>
                <td className="py-4 px-6 text-sm">{formatCategory(p.category)}</td>
                <td className="py-4 px-6 text-sm">{p.quantity}</td>
                <td className="py-4 px-6 text-sm">₦{p.selling_price.toLocaleString()}</td>
                <td className="py-4 px-6 text-sm">{p.cost_price ? `₦${p.cost_price.toLocaleString()}` : "-"}</td>
                <td className="py-4 px-6 text-sm">{statusBadge(p)}</td>
                <td className="py-4 px-6 text-sm relative">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(p.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>
                    
                    {dropdownOpen === p.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(p);
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Product
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id, p.name);
                          }}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Product
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
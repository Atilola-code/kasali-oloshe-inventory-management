// src/app/components/InventoryDashboard.tsx
'use client'
import { useEffect, useState } from "react";
import DashboardLayout from "./layout/DashboardLayout";
import AddProductModal from "./products/AddProductModal";
import EditProductModal from "./products/EditProductModal";
import ProductTable from "./products/ProductTable";
import SalesModal from "./salesComponent/SaleModal";
import ReceiptView from "./salesComponent/ReceiptView";
import RegisterModal from "./auth/RegisterModal";
import { useAuth } from "@/contexts/AuthContext";
import { Product, DashboardView } from "@/app/types";
import { showSuccess, showError } from "@/app/utils/toast";
import { apiFetch } from "@/services/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function InventoryDashboardPage() {
  const { user } = useAuth();
  const [view, setView] = useState<DashboardView>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lastProductSku, setLastProductSku] = useState<string>("");
  const [isSaleStopped, setIsSaleStopped] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchStopSaleStatus();
  }, []);

  async function fetchStopSaleStatus() {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/sales/stop-sale/`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setIsSaleStopped(data.is_sale_stopped);
      }
    } catch (error) {
      console.error("Error fetching stop sale status:", error);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/inventory/');  // ← Use apiFetch

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        showError(`Failed to load products: ${res.status}`);
        throw new Error(`Failed to load products: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      
      // Get last product SKU for auto-generation
      if (data.length > 0) {
        const sortedProducts = [...data].sort((a, b) => b.id - a.id);
        setLastProductSku(sortedProducts[0].sku);
      }
      
      // Sort by date_added ascending (oldest first, newest last)
      const sortedProducts = [...data].sort((a, b) => 
        new Date(a.date_added || a.id).getTime() - new Date(b.date_added || b.id).getTime()
      );
      setProducts(sortedProducts);
      
    } catch (err) {
      console.error("Full error:", err);
      showError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  const handleUserRegistered = () => {
    setRegisterOpen(false);
    showSuccess("User registered successfully!");
  };

  function handleSaleCompleted(sale: any) {
    setSelectedSaleId(sale.invoice_id || sale.id);
    setView("receipt");
    fetchProducts(); // refresh stock
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setEditOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await apiFetch(`/api/inventory/${productId}/`, {
        method: "DELETE",
      
      });

      if (!res.ok) {
        throw new Error("Failed to delete product");
      }

      // Remove product from local state
      setProducts(products.filter(p => p.id !== productId));
      showSuccess("Product deleted successfully!");
    } catch (err) {
      console.error(err);
      showError("Failed to delete product");
    }
  };

  return (
    <DashboardLayout query={query} setQuery={setQuery} setView={setView} view={view} onRegisterClick={() => setRegisterOpen(true)}>
      {view === "products" && (
        <div>
          <ProductTable
            products={products}
            query={query}
            setQuery={setQuery}
            onAddProduct={() => setAddOpen(true)}
            onRecordSale={() => setSaleOpen(true)}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
          />
          <AddProductModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onProductAdded={fetchProducts}
            lastProductSku={lastProductSku}
          />
          <EditProductModal
            open={editOpen}
            onClose={() => {
              setEditOpen(false);
              setSelectedProduct(null);
            }}
            product={selectedProduct}
            onProductUpdated={fetchProducts}
          />
          <SalesModal
            open={saleOpen}
            onClose={() => setSaleOpen(false)}
            products={products}
            onSaleCompleted={handleSaleCompleted}
            isSaleStopped={false}
            userRole={user?.role || null}
          />
          <RegisterModal
            open={registerOpen}
            onClose={() => setRegisterOpen(false)}
            onSuccess={handleUserRegistered}
          />
        </div>
      )}

      {view === "sales" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Sales</h2>
              <p className="text-gray-600">Create quick sales and print receipts.</p>
            </div>
            <div>
              <button onClick={() => setSaleOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">New Sale</button>
            </div>
          </div>
          <ProductTable
            products={products}
            query={query}
            setQuery={setQuery}
            onAddProduct={() => setAddOpen(true)}
            onRecordSale={() => setSaleOpen(true)}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
          />
          <SalesModal
            open={saleOpen}
            onClose={() => setSaleOpen(false)}
            products={products}
            onSaleCompleted={handleSaleCompleted}
            isSaleStopped={isSaleStopped}
            userRole={user?.role || null}
          />
        </div>
      )}

      {view === "receipt" && (
        <ReceiptView
          saleId={selectedSaleId}
          onDone={() => {
            setView("products");
            setSelectedSaleId(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
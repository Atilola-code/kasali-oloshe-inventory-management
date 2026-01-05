// src/app/components/sales/ReceiptView.tsx
import React, { useEffect, useState, useRef } from "react";
import { Printer, X } from "lucide-react";
import { showSuccess } from "@/app/utils/toast";

type Props = {
  saleId: string | null;
  onDone: () => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ReceiptView({ saleId, onDone }: Props) {
  const [saleData, setSaleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!saleId) return;
    
    const fetchSale = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");
        
        const res = await fetch(`${API_URL}/api/sales/`, { 
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch sale");
        }

        const data = await res.json();
        
        // Find the sale with matching invoice_id
        const sale = Array.isArray(data) 
          ? data.find((s: any) => s.invoice_id === saleId)
          : data;
        
        setSaleData(sale);
        setHasPrinted(sale?.receipt_print_count && sale.receipt_print_count > 0);
      } catch (err) {
        console.error("Error fetching sale:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [saleId]);

  const handlePrint = async () => {
    window.print();
    
    // Track the print event
    if (!hasPrinted && saleData) {
      try {
        const token = localStorage.getItem("access_token");
        
        // Increment receipt print count
        const res = await fetch(`${API_URL}/api/sales/${saleData.id}/increment-print-count/`, {
          method: "PATCH",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          credentials: "include",
        });

        if (res.ok) {
          setHasPrinted(true);
          showSuccess("Receipt printed successfully!");
        }
      } catch (error) {
        console.error("Error updating print count:", error);
      }
    }
  };

  const handlePrintToPrinter = () => {
    window.print();
    setShowPrintOptions(false);
  };

  const handleSaveAsPDF = () => {
    window.print();
    setShowPrintOptions(false);
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading receipt...</p>
      </div>
    );
  }

  if (!saleData) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Receipt not found</p>
        <button onClick={onDone} className="mt-4 px-4 py-2 border rounded">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto mt-8">
        {/* Action Buttons - Don't Print */}
        <div className="no-print flex justify-between items-center mb-6">
          <button
            onClick={onDone}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
            Close
          </button>
          <div className="flex gap-2">
            {!hasPrinted && (
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm mr-2">
                First print will lock editing for cashiers
              </div>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-4 h-4" />
              {hasPrinted ? 'Reprint Receipt' : 'Print Receipt'}
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div 
          id="receipt-content" 
          ref={printRef}
          className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-6 border-b-2 pb-4">
            <h1 className="text-3xl font-bold text-gray-800">Kasali Oloshe</h1>
            <p className="text-sm text-gray-600 mt-1">Inventory Management System</p>
            <p className="text-xs text-gray-500 mt-2">Receipt</p>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-600">Invoice ID:</p>
              <p className="font-semibold">{saleData.invoice_id}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Date:</p>
              <p className="font-semibold">
                {new Date(saleData.date).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {saleData.customer_name && (
              <div>
                <p className="text-gray-600">Customer:</p>
                <p className="font-semibold">{saleData.customer_name}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-gray-600">Cashier:</p>
              <p className="font-semibold">{saleData.cashier_name || 'N/A'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <table className="w-full">
              <thead className="border-b-2">
                <tr className="text-left">
                  <th className="pb-2 text-sm font-semibold text-gray-700">Item</th>
                  <th className="pb-2 text-sm font-semibold text-gray-700 text-center">Qty</th>
                  <th className="pb-2 text-sm font-semibold text-gray-700 text-right">Price</th>
                  <th className="pb-2 text-sm font-semibold text-gray-700 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {saleData.items?.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3">
                      <div className="font-medium text-gray-900">
                        {item.product_name || item.product}
                      </div>
                    </td>
                    <td className="py-3 text-center text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      ₦{Number(item.unit_price).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-900">
                      ₦{Number(item.subtotal).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t-2 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                ₦{Number(saleData.subtotal).toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            
            {saleData.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="font-medium text-red-600">
                  -₦{Number(saleData.discount_amount).toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            )}
            
            {saleData.vat_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT:</span>
                <span className="font-medium">
                  ₦{Number(saleData.vat_amount).toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>
                ₦{Number(saleData.total_amount).toLocaleString('en-NG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>

            <div className="flex justify-between text-sm mt-4">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium capitalize">{saleData.payment_method}</span>
            </div>

            {saleData.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium">
                    ₦{Number(saleData.amount_paid).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
                {saleData.change_due > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Change:</span>
                    <span className="font-medium text-green-600">
                      ₦{Number(saleData.change_due).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">Please keep this receipt for your records</p>
            {hasPrinted && (
              <p className="mt-2 text-xs">
                Print Count: {saleData.receipt_print_count || 1}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
// "use client";

// import DashboardLayout from "../layout/DashboardLayout";
// import ProductTable from "../products/ProductTable";
// import AddProductModal from "../products/AddProductModal";
// import { useState } from "react";

// export default function ProductsPage() {
//   const [open, setOpen] = useState(false);

//   return (
//     <DashboardLayout>
//       <div className="flex justify-between items-start mb-6">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">Product Inventory</h1>
//           <p className="text-gray-500 text-sm">
//             Manage your product list, check stock levels, and perform sales transactions.
//           </p>
//         </div>
//         <button
//           onClick={() => setOpen(true)}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
//         >
//           + Add Product
//         </button>
//       </div>

//       <ProductTable />
//       <AddProductModal open={open} onClose={() => setOpen(false)} />
//     </DashboardLayout>
//   );
// }

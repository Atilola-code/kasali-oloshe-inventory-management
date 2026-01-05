// src/app/components/products/ProductStatusBadge.tsx
export default function ProductStatusBadge({ quantity, lowStock }: { quantity: number; lowStock: number }) {
  let color = "bg-green-100 text-green-800";
  let text = "In Stock";

  if (quantity <= 0) {
    color = "bg-red-100 text-red-800";
    text = "Out of Stock";
  } else if (quantity <= lowStock) {
    color = "bg-yellow-100 text-yellow-800";
    text = "Low Stock";
  }

  return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{text}</span>;
}

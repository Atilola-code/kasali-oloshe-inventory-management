//src/app/component/purchaseOrders/POSkeleton
export const POSkeleton = () => (
  <div className="animate-pulse bg-white rounded-xl p-6">
    <div className="h-4 bg-gray-200 rounded mb-4"></div>
    <div className="grid grid-cols-4 gap-4">
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Skeleton for table rows
export const POTableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
      </tr>
    ))}
  </>
);
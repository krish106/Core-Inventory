export default function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    waiting: 'bg-blue-100 text-blue-700 border-blue-200',
    ready: 'bg-amber-100 text-amber-700 border-amber-200',
    done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    in_stock: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    low_stock: 'bg-amber-100 text-amber-700 border-amber-200',
    out_of_stock: 'bg-red-100 text-red-700 border-red-200',
  };
  const labels = {
    draft: 'Draft', waiting: 'Waiting', ready: 'Ready', done: 'Done', cancelled: 'Cancelled',
    in_stock: '✅ In Stock', low_stock: '⚠️ Low Stock', out_of_stock: '🔴 Out of Stock'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
}

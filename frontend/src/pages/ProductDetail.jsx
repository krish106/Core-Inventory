import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import LabelPrinter from '../components/LabelPrinter';
import { ArrowLeft, Edit2 } from 'lucide-react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/products/${id}`).then(r => setProduct(r.data)).catch(() => navigate('/products')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  if (!product) return null;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/products')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> Back to Products</button>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{product.sku}</span>
            {product.category_name && <span className="text-sm text-gray-500">{product.category_name}</span>}
          </div>
        </div>
        <div>
          <LabelPrinter product={product} />
        </div>
      </div>
      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[['Unit', product.unit_of_measure], ['Cost Price', `₹${product.cost_price}`], ['Selling Price', `₹${product.selling_price}`], ['Reorder Point', product.reorder_point], ['Barcode', product.barcode || '-']].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{label}</p><p className="text-lg font-semibold mt-1">{val}</p>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total On Hand</p><p className="text-3xl font-bold text-blue-600">{product.total_on_hand}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500">Total Free to Ship</p><p className="text-3xl font-bold text-emerald-600">{product.total_free_to_ship}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold">Stock by Location</h3></div>
        <table className="w-full">
          <thead><tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Location</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Reserved</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Free</th>
            <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {(product.stock_by_location || []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No stock available</td></tr>
            ) : product.stock_by_location.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-sm">{s.warehouse_name} ({s.warehouse_code})</td>
                <td className="px-4 py-2.5 text-sm">{s.location_name} ({s.location_code})</td>
                <td className="px-4 py-2.5 text-sm text-right font-semibold">{s.quantity}</td>
                <td className="px-4 py-2.5 text-sm text-right">{s.reserved_qty}</td>
                <td className="px-4 py-2.5 text-sm text-right">{s.free_to_ship}</td>
                <td className="px-4 py-2.5 text-center"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold">Recent Movements</h3></div>
        <table className="w-full">
          <thead><tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Date</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Type</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Balance</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Reference</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {(product.recent_movements || []).map((m, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 text-sm text-gray-500">{new Date(m.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  m.movement_type === 'in' ? 'bg-emerald-100 text-emerald-700' : m.movement_type === 'out' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>{m.movement_type.toUpperCase()}</span></td>
                <td className={`px-4 py-2.5 text-sm text-right font-medium ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                <td className="px-4 py-2.5 text-sm text-right">{m.balance_after}</td>
                <td className="px-4 py-2.5 text-sm text-gray-500">{m.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

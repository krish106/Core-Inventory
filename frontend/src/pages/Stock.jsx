import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ExportButton from '../components/ExportButton';
import { Search } from 'lucide-react';

export default function Stock() {
  const navigate = useNavigate();
  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStock = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter) params.set('stock_status', filter);
    if (selectedWarehouse) params.set('warehouse_id', selectedWarehouse);
    api.get(`/stock/overview?${params}`).then(r => setStock(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { api.get('/warehouses').then(r => setWarehouses(r.data)); }, []);
  useEffect(() => { const t = setTimeout(fetchStock, 300); return () => clearTimeout(t); }, [search, filter, selectedWarehouse]);

  useEffect(() => {
    const handler = () => fetchStock();
    window.addEventListener('operation-completed', handler);
    return () => window.removeEventListener('operation-completed', handler);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
            <option value="">All Status</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option>
          </select>
          <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
            <option value="">All Warehouses</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <ExportButton endpoint="/reports/stock" filters={{ search, stock_status: filter, warehouse_id: selectedWarehouse }} title="Stock Report" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">SKU</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Per Unit Cost</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Free to Ship</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Stock Value</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : stock.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No products found</td></tr>
              ) : stock.map(s => (
                <tr key={s.product_id} onClick={() => navigate(`/products/${s.product_id}`)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-sm text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{s.sku}</td>
                  <td className="px-4 py-3 text-sm text-right">₹{parseFloat(s.cost_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sm">{s.on_hand}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 hidden md:table-cell">{s.free_to_ship}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 hidden lg:table-cell">₹{parseFloat(s.stock_value || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

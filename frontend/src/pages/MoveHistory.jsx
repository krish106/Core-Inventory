import { useState, useEffect } from 'react';
import api from '../api/axios';
import ExportButton from '../components/ExportButton';
import { Search } from 'lucide-react';

export default function MoveHistory() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ movement_type: '', warehouse_id: '', start_date: '', end_date: '' });
  const [warehouses, setWarehouses] = useState([]);

  const fetchLedger = () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    api.get(`/stock/ledger?${params}`).then(r => setLedger(r.data.ledger || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { api.get('/warehouses').then(r => setWarehouses(r.data)); }, []);
  useEffect(fetchLedger, [filters]);

  const typeBadge = { in: 'bg-emerald-100 text-emerald-700', out: 'bg-red-100 text-red-700', adjustment: 'bg-amber-100 text-amber-700' };
  const typeLabel = { in: '📥 IN', out: '📤 OUT', adjustment: '✏️ ADJ' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Move History</h1>
        <ExportButton endpoint="/reports/movements" filters={filters} title="Move History" />
      </div>
      <div className="flex flex-wrap gap-3">
        <select value={filters.movement_type} onChange={e => setFilters({...filters, movement_type: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Types</option><option value="in">📥 Incoming</option><option value="out">📤 Outgoing</option><option value="adjustment">✏️ Adjustment</option>
        </select>
        <input type="date" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm" title="Start Date" />
        <input type="date" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm" title="End Date" />
        <select value={filters.warehouse_id} onChange={e => setFilters({...filters, warehouse_id: e.target.value})} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Warehouses</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Location</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Quantity</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Balance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">By</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : ledger.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No movements found</td></tr>
              ) : ledger.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-sm text-gray-500">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge[m.movement_type]}`}>{typeLabel[m.movement_type]}</span></td>
                  <td className="px-4 py-2.5"><p className="text-sm font-medium">{m.product_name}</p><p className="text-xs text-gray-400">{m.sku}</p></td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 hidden md:table-cell">{m.warehouse_name} → {m.location_name}</td>
                  <td className={`px-4 py-2.5 text-sm text-right font-medium ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                  <td className="px-4 py-2.5 text-sm text-right hidden md:table-cell">{m.balance_after}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 hidden lg:table-cell">{m.reference || m.operation_reference || '-'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 hidden lg:table-cell">{m.performed_by_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

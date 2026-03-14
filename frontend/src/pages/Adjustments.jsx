import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AlertCircle, Check } from 'lucide-react';

export default function Adjustments() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/locations').then(r => setLocations(r.data));
    api.get('/products?limit=500').then(r => setProducts(r.data.products || []));
  }, []);

  const addProduct = (productId) => {
    if (!productId || lines.find(l => l.product_id === productId)) return;
    const p = products.find(pr => pr.id === productId);
    setLines([...lines, { product_id: productId, product_name: p?.name, sku: p?.sku, system_qty: p?.on_hand || 0, counted_qty: '' }]);
  };

  const updateCounted = (idx, val) => {
    const updated = [...lines];
    updated[idx].counted_qty = val;
    setLines(updated);
  };

  const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

  const handleApply = async () => {
    if (!selectedLocation || lines.length === 0) return;
    if (!window.confirm('Apply this inventory adjustment? Stock quantities will be updated.')) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const opLines = lines.map(l => ({ product_id: l.product_id, expected_qty: parseInt(l.counted_qty) || 0 }));
      const opRes = await api.post('/operations', {
        type: 'adjustment', source_location_id: selectedLocation, lines: opLines, notes: 'Physical Count Adjustment'
      });
      // Set actual_qty to counted quantities
      for (const line of opRes.data.lines) {
        const match = lines.find(l => l.product_id === line.product_id);
        if (match) {
          await api.put(`/operations/${opRes.data.id}/lines/${line.id}`, { actual_qty: parseInt(match.counted_qty) || 0 });
        }
      }
      await api.post(`/operations/${opRes.data.id}/validate`);
      setSuccess('Adjustment applied successfully!');
      setLines([]);
      setTimeout(() => navigate('/stock'), 2000);
    } catch (err) { setError(err.response?.data?.error || 'Adjustment failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Adjustment</h1>
      {error && <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-xl text-sm flex items-start gap-2"><AlertCircle size={16} />{error}</div>}
      {success && <div className="bg-emerald-50 border-l-4 border-emerald-400 text-emerald-700 px-4 py-3 rounded-r-xl text-sm flex items-start gap-2"><Check size={16} />{success}</div>}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
          <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Select location...</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name}</option>)}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Product</label>
          <select onChange={e => { addProduct(e.target.value); e.target.value = ''; }} className="w-full max-w-md px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Select product to add...</option>{products.filter(p => !lines.find(l => l.product_id === p.id)).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </div>
        {lines.length > 0 && (
          <table className="w-full mb-4">
            <thead><tr className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">System Qty</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Counted Qty</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Difference</th>
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {lines.map((l, i) => {
                const diff = l.counted_qty !== '' ? parseInt(l.counted_qty) - l.system_qty : null;
                return (
                  <tr key={i}>
                    <td className="px-3 py-2"><p className="text-sm font-medium text-gray-900 dark:text-gray-100">{l.product_name}</p><p className="text-xs text-gray-400">{l.sku}</p></td>
                    <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{l.system_qty}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" value={l.counted_qty} onChange={e => updateCounted(i, e.target.value)} min={0}
                        className="w-24 px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      {diff != null && <span className={`font-medium ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>{diff > 0 ? '+' : ''}{diff}</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeLine(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button onClick={handleApply} disabled={loading || !selectedLocation || lines.length === 0 || lines.some(l => l.counted_qty === '')}
          className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all">
          {loading ? 'Applying...' : 'Apply Adjustment'}
        </button>
      </div>
    </div>
  );
}

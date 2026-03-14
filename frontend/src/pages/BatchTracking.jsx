import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, Layers, AlertTriangle } from 'lucide-react';

export default function BatchTracking() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ batch_number: '', product_id: '', manufacture_date: '', expiry_date: '', supplier_id: '', notes: '' });

  const fetchBatches = () => {
    setLoading(true);
    const params = filter ? `?expired=${filter}` : '';
    api.get(`/batches${params}`).then(r => setBatches(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBatches(); }, [filter]);
  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data?.products || r.data || [])).catch(() => {});
    api.get('/contacts').then(r => setSuppliers((r.data || []).filter(c => c.type === 'supplier' || c.type === 'both'))).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches', form);
      setShowCreate(false);
      setForm({ batch_number: '', product_id: '', manufacture_date: '', expiry_date: '', supplier_id: '', notes: '' });
      fetchBatches();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const getExpiryStatus = (expiry_date) => {
    if (!expiry_date) return { label: 'No Expiry', color: 'bg-gray-100 text-gray-600' };
    const days = Math.ceil((new Date(expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
    if (days <= 30) return { label: `${days}d left`, color: 'bg-amber-100 text-amber-700' };
    return { label: `${days}d left`, color: 'bg-emerald-100 text-emerald-700' };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Track product batches and expiry dates</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={18} /> New Batch
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['', 'All'], ['soon', '⚠️ Expiring Soon'], ['true', '❌ Expired']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === val ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Batch #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Mfg Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expiry</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : batches.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <Layers className="mx-auto mb-2 text-gray-300" size={32} />No batches found</td></tr>
              ) : batches.map(b => {
                const status = getExpiryStatus(b.expiry_date);
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{b.batch_number}</td>
                    <td className="px-4 py-3"><p className="text-sm font-medium">{b.product_name}</p><p className="text-xs text-gray-400">{b.sku}</p></td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">{b.supplier_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{b.manufacture_date ? new Date(b.manufacture_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm">{b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium text-sm">{b.total_qty}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">New Batch</h2></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Batch Number *</label>
                  <input value={form.batch_number} onChange={e => setForm({ ...form, batch_number: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="BATCH-001" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Product *</label>
                  <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="">Select</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Manufacture Date</label>
                  <input type="date" value={form.manufacture_date} onChange={e => setForm({ ...form, manufacture_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier</label>
                <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">Select</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Create Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

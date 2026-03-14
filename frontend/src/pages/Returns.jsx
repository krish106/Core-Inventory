import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, RotateCcw } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700', approved: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
};

export default function Returns() {
  const navigate = useNavigate();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    type: 'customer_return', contact_id: '', reason: '', resolution: 'restock', notes: '',
    lines: [{ product_id: '', quantity: 1, reason: '', condition: 'good', resolution: 'restock' }]
  });

  const fetchReturns = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    api.get(`/returns${params}`).then(r => setReturns(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchReturns(); }, [filter]);
  useEffect(() => {
    api.get('/contacts').then(r => setContacts(r.data || [])).catch(() => {});
    api.get('/products').then(r => setProducts(r.data?.products || r.data || [])).catch(() => {});
  }, []);

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', quantity: 1, reason: '', condition: 'good', resolution: form.resolution }] });
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, val) => { const l = [...form.lines]; l[i] = { ...l[i], [field]: val }; setForm({ ...form, lines: l }); };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/returns', form);
      setShowCreate(false);
      setForm({ type: 'customer_return', contact_id: '', reason: '', resolution: 'restock', notes: '', lines: [{ product_id: '', quantity: 1, reason: '', condition: 'good', resolution: 'restock' }] });
      fetchReturns();
      navigate(`/returns/${res.data.id}`);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
          <p className="text-sm text-gray-500 mt-1">Process customer and supplier returns</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={18} /> New Return
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'draft', 'approved', 'processing', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Resolution</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : returns.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <RotateCcw className="mx-auto mb-2 text-gray-300" size={32} />No returns found</td></tr>
              ) : returns.map(r => (
                <tr key={r.id} onClick={() => navigate(`/returns/${r.id}`)} className="hover:bg-gray-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{r.reference}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.type === 'customer_return' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {r.type === 'customer_return' ? 'Customer' : 'Supplier'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{r.contact_name || '-'}</td>
                  <td className="px-4 py-3 text-sm capitalize hidden md:table-cell">{r.resolution || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(r.total_value || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status]}`}>{r.status?.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">New Return</h2></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Return Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="customer_return">Customer Return</option><option value="supplier_return">Supplier Return</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Contact</label>
                  <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="">Select Contact</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Reason</label>
                  <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Defective, wrong item..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Resolution</label>
                  <select value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="restock">Restock</option><option value="scrap">Scrap</option><option value="replace">Replace</option><option value="refund">Refund</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Return Lines</label>
                  <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <select value={line.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)} required className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="">Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <input type="number" min="1" value={line.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)} className="w-16 px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                      <select value={line.condition} onChange={e => updateLine(i, 'condition', e.target.value)} className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="good">Good</option><option value="damaged">Damaged</option><option value="expired">Expired</option>
                      </select>
                      {form.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">✕</button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Create Return</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

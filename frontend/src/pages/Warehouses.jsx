import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Plus, X, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLocModal, setShowLocModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [whDetail, setWhDetail] = useState(null);
  const [form, setForm] = useState({ name: '', short_code: '', address: '' });
  const [locForm, setLocForm] = useState({ name: '', short_code: '', type: 'internal' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchWarehouses = () => {
    setLoading(true);
    api.get('/warehouses').then(r => setWarehouses(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(fetchWarehouses, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/warehouses', form);
      setShowCreate(false); setForm({ name: '', short_code: '', address: '' }); fetchWarehouses();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/locations', { ...locForm, warehouse_id: showLocModal });
      setShowLocModal(null); setLocForm({ name: '', short_code: '', type: 'internal' });
      if (expandedId) loadDetail(expandedId);
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const loadDetail = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    const r = await api.get(`/warehouses/${id}`);
    setWhDetail(r.data);
    setExpandedId(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all">
          <Plus size={16} /> New Warehouse
        </button>
      </div>

      <div className="space-y-4">
        {loading ? [...Array(2)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />) :
         warehouses.length === 0 ? <div className="text-center py-16 text-gray-400 bg-white rounded-xl">No warehouses found. Create your first warehouse.</div> :
         warehouses.map(w => (
          <div key={w.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-start justify-between cursor-pointer hover:bg-gray-50/50 transition-colors" onClick={() => loadDetail(w.id)}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{w.name}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{w.short_code}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{w.address || 'No address'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span><strong>{w.location_count}</strong> Locations</span>
                    <span><strong>{w.product_count}</strong> Products</span>
                    <span><strong>{w.total_stock}</strong> Total Stock</span>
                  </div>
                </div>
              </div>
              {expandedId === w.id ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </div>

            {expandedId === w.id && whDetail && (
              <div className="border-t border-gray-100 p-5 animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm text-gray-700">Locations</h4>
                  <button onClick={(e) => { e.stopPropagation(); setShowLocModal(w.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100"><Plus size={12} /> Add Location</button>
                </div>
                <table className="w-full">
                  <thead><tr className="bg-gray-50/50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Code</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Type</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Stock</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {(whDetail.locations || []).map(l => (
                      <tr key={l.id}>
                        <td className="px-3 py-2 text-sm">{l.name}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-500">{l.short_code}</td>
                        <td className="px-3 py-2 text-sm"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs capitalize">{l.type}</span></td>
                        <td className="px-3 py-2 text-sm text-right font-medium">{l.total_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Warehouse Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">New Warehouse</h2><button onClick={() => setShowCreate(false)}><X size={20} className="text-gray-400" /></button></div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Short Code *</label>
                <input type="text" value={form.short_code} onChange={e => setForm({...form, short_code: e.target.value})} required placeholder="e.g. WH-1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowLocModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Add Location</h2><button onClick={() => setShowLocModal(null)}><X size={20} className="text-gray-400" /></button></div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <form onSubmit={handleAddLocation} className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Short Code *</label>
                <input type="text" value={locForm.short_code} onChange={e => setLocForm({...locForm, short_code: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={locForm.type} onChange={e => setLocForm({...locForm, type: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="internal">Internal</option><option value="input">Input</option><option value="output">Output</option>
                  <option value="production">Production</option><option value="scrap">Scrap</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLocModal(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{saving ? 'Adding...' : 'Add Location'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

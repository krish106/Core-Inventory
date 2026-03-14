import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, ClipboardList } from 'lucide-react';

const statusColors = {
  planned: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
};

export default function CycleCounts() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ warehouse_id: '', count_type: 'full', scheduled_date: '', notes: '' });

  const fetchCounts = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    api.get(`/cycle-counts${params}`).then(r => setCounts(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCounts(); }, [filter]);
  useEffect(() => { api.get('/warehouses').then(r => setWarehouses(r.data)).catch(() => {}); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/cycle-counts', form);
      setShowCreate(false);
      setForm({ warehouse_id: '', count_type: 'full', scheduled_date: '', notes: '' });
      fetchCounts();
      navigate(`/cycle-counts/${res.data.id}`);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cycle Counts</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule and track inventory audits</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={18} /> New Cycle Count
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'planned', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s ? s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Scheduled</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : counts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <ClipboardList className="mx-auto mb-2 text-gray-300" size={32} />No cycle counts found</td></tr>
              ) : counts.map(cc => (
                <tr key={cc.id} onClick={() => navigate(`/cycle-counts/${cc.id}`)} className="hover:bg-gray-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{cc.reference}</td>
                  <td className="px-4 py-3 text-sm">{cc.warehouse_name || '-'}</td>
                  <td className="px-4 py-3 text-sm capitalize hidden md:table-cell">{cc.count_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{cc.scheduled_date ? new Date(cc.scheduled_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-center text-sm">{cc.counted_lines || 0} / {cc.line_count || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[cc.status]}`}>
                      {cc.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">New Cycle Count</h2></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Warehouse *</label>
                <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                  <option value="">Select Warehouse</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Count Type</label>
                  <select value={form.count_type} onChange={e => setForm({ ...form, count_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm">
                    <option value="full">Full Count</option><option value="abc">ABC Classification</option>
                    <option value="random">Random Sample</option><option value="category">By Category</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Scheduled Date</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Create Count</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

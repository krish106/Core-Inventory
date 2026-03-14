import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, Plus, Trash2, Check, X, AlertCircle } from 'lucide-react';

export default function OperationDetail({ opType, backPath, backLabel }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [operation, setOperation] = useState(null);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form
  const [form, setForm] = useState({ source_location_id: '', destination_location_id: '', scheduled_date: new Date().toISOString().split('T')[0], notes: '' });
  const [creating, setCreating] = useState(false);

  // Add line
  const [newLine, setNewLine] = useState({ product_id: '', expected_qty: 1 });

  useEffect(() => {
    api.get('/products?limit=500').then(r => setProducts(r.data.products || []));
    api.get('/locations').then(r => setLocations(r.data));
    if (!isNew) {
      api.get(`/operations/${id}`).then(r => setOperation(r.data)).catch(() => navigate(backPath)).finally(() => setLoading(false));
    }
  }, [id]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setCreating(true);
    try {
      const data = { type: opType, ...form, scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null };
      const res = await api.post('/operations', data);
      navigate(`${backPath}/${res.data.id}`);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create'); }
    finally { setCreating(false); }
  };

  const handleAddLine = async () => {
    if (!newLine.product_id) return;
    setError('');
    try {
      await api.post(`/operations/${id}/lines`, newLine);
      const r = await api.get(`/operations/${id}`);
      setOperation(r.data);
      setNewLine({ product_id: '', expected_qty: 1 });
    } catch (err) { setError(err.response?.data?.error || 'Failed to add line'); }
  };

  const handleUpdateLine = async (lineId, actual_qty) => {
    try {
      await api.put(`/operations/${id}/lines/${lineId}`, { actual_qty: parseInt(actual_qty) });
    } catch (err) { console.error(err); }
  };

  const handleRemoveLine = async (lineId) => {
    try {
      await api.delete(`/operations/${id}/lines/${lineId}`);
      const r = await api.get(`/operations/${id}`);
      setOperation(r.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to remove line'); }
  };

  const handleStatusChange = async (newStatus) => {
    setError('');
    try {
      await api.patch(`/operations/${id}/status`, { status: newStatus });
      const r = await api.get(`/operations/${id}`);
      setOperation(r.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to update status'); }
  };

  const handleValidate = async () => {
    if (!window.confirm('Validate this operation? Stock will be updated.')) return;
    setValidating(true); setError('');
    try {
      const res = await api.post(`/operations/${id}/validate`);
      setSuccess('Operation validated successfully!');
      setOperation(res.data.operation);
      setTimeout(() => navigate(backPath), 2000);
    } catch (err) { setError(err.response?.data?.error || 'Validation failed'); }
    finally { setValidating(false); }
  };

  const statuses = ['draft', 'waiting', 'ready', 'done'];
  const isDone = operation?.status === 'done';
  const isCancelled = operation?.status === 'cancelled';

  if (isNew) {
    const needsSource = ['delivery', 'internal_transfer', 'adjustment'].includes(opType);
    const needsDest = ['receipt', 'internal_transfer'].includes(opType);
    return (
      <div className="space-y-6 max-w-2xl">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> {backLabel}</button>
        <h1 className="text-2xl font-bold text-gray-900">New {opType === 'internal_transfer' ? 'Transfer' : opType.charAt(0).toUpperCase() + opType.slice(1)}</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          {needsSource && <div><label className="block text-sm font-medium text-gray-700 mb-1">Source Location *</label>
            <select value={form.source_location_id} onChange={e => setForm({...form, source_location_id: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name} ({l.short_code})</option>)}
            </select></div>}
          {needsDest && <div><label className="block text-sm font-medium text-gray-700 mb-1">Destination Location *</label>
            <select value={form.destination_location_id} onChange={e => setForm({...form, destination_location_id: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name} ({l.short_code})</option>)}
            </select></div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <button type="submit" disabled={creating} className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Operation'}
          </button>
        </form>
      </div>
    );
  }

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  if (!operation) return null;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(backPath)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> {backLabel}</button>

      {error && <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-r-xl text-sm flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
      {success && <div className="bg-emerald-50 border-l-4 border-emerald-400 text-emerald-700 px-4 py-3 rounded-r-xl text-sm flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0" />{success}</div>}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{operation.reference}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {operation.dest_location_name && `Destination: ${operation.dest_warehouse_name} → ${operation.dest_location_name}`}
            {operation.source_location_name && operation.dest_location_name && ' | '}
            {operation.source_location_name && `Source: ${operation.source_warehouse_name} → ${operation.source_location_name}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {statuses.map((s, i) => {
            const idx = statuses.indexOf(operation.status);
            const isActive = s === operation.status;
            const isPast = i < idx;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : isPast ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                }`}>{s.charAt(0).toUpperCase() + s.slice(1)}</div>
                {i < statuses.length - 1 && <div className={`w-4 h-0.5 ${isPast ? 'bg-emerald-300' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[['Created', new Date(operation.created_at).toLocaleDateString()],
          ['Scheduled', operation.scheduled_date ? new Date(operation.scheduled_date).toLocaleDateString() : '-'],
          ['Responsible', operation.responsible_name || operation.created_by_name || '-'],
          ['Contact', operation.contact_name || '-']
        ].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <p className="text-xs text-gray-500">{label}</p><p className="text-sm font-medium mt-1">{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold">Products</h3>
          <span className="text-xs text-gray-400">{operation.lines?.length || 0} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">SKU</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Expected</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Actual</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Diff</th>
              {!isDone && !isCancelled && <th className="px-4 py-2.5"></th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(operation.lines || []).map(line => {
                const diff = line.actual_qty != null ? line.actual_qty - line.expected_qty : null;
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-2.5 text-sm font-medium">{line.product_name}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 hidden md:table-cell">{line.sku}</td>
                    <td className="px-4 py-2.5 text-sm text-right">{line.expected_qty}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isDone || isCancelled ? <span className="text-sm">{line.actual_qty ?? '-'}</span> :
                        <input type="number" defaultValue={line.actual_qty ?? line.expected_qty} min={0}
                          onBlur={e => handleUpdateLine(line.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none" />}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {diff != null && diff !== 0 && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{diff > 0 ? '+' : ''}{diff}</span>}
                    </td>
                    {!isDone && !isCancelled && (
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => handleRemoveLine(line.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isDone && !isCancelled && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
            <select value={newLine.product_id} onChange={e => setNewLine({...newLine, product_id: e.target.value})} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">Select product...</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <input type="number" value={newLine.expected_qty} onChange={e => setNewLine({...newLine, expected_qty: parseInt(e.target.value) || 1})} min={1}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right" placeholder="Qty" />
            <button onClick={handleAddLine} disabled={!newLine.product_id}
              className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-40 transition-colors">
              <Plus size={14} /> Add Line
            </button>
          </div>
        )}
      </div>

      {operation.notes && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3><p className="text-sm text-gray-500">{operation.notes}</p></div>}

      {!isDone && !isCancelled && (
        <div className="flex flex-wrap gap-3">
          {operation.status === 'draft' && <button onClick={() => handleStatusChange('ready')} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">Mark Ready</button>}
          <button onClick={handleValidate} disabled={validating || (operation.lines || []).length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all">
            <Check size={16} /> {validating ? 'Validating...' : 'Validate (Update Stock)'}
          </button>
          <button onClick={() => handleStatusChange('cancelled')} className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}

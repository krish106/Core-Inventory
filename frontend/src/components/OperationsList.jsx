import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search } from 'lucide-react';

export default function OperationsList({ type, title, basePath }) {
  const navigate = useNavigate();
  const [operations, setOperations] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOps = () => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    api.get(`/operations?${params}`).then(r => setOperations(r.data.operations || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(fetchOps, 300); return () => clearTimeout(t); }, [status, search]);
  useEffect(() => {
    const handler = () => fetchOps();
    window.addEventListener('operation-completed', handler);
    window.addEventListener('operation-created', handler);
    return () => { window.removeEventListener('operation-completed', handler); window.removeEventListener('operation-created', handler); };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <button onClick={() => navigate(`${basePath}/new`)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all">
          <Plus size={16} /> New
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Status</option><option value="draft">Draft</option><option value="waiting">Waiting</option>
          <option value="ready">Ready</option><option value="done">Done</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Scheduled Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(3)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : operations.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No {title.toLowerCase()} found</td></tr>
              ) : operations.map(op => (
                <tr key={op.id} onClick={() => navigate(`${basePath}/${op.id}`)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-sm text-blue-600">{op.reference}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{op.contact_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{op.scheduled_date ? new Date(op.scheduled_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {type === 'receipt' ? op.dest_location_name : type === 'delivery' ? op.source_location_name :
                     `${op.source_location_name || ''} → ${op.dest_location_name || ''}`}
                  </td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={op.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

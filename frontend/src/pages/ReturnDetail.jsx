import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700', approved: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
};
const conditionColors = { good: 'bg-emerald-100 text-emerald-700', damaged: 'bg-red-100 text-red-700', expired: 'bg-amber-100 text-amber-700' };

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReturn = () => {
    setLoading(true);
    api.get(`/returns/${id}`).then(r => setRet(r.data)).catch(() => navigate('/returns')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchReturn(); }, [id]);

  const updateStatus = async (status) => {
    try { await api.patch(`/returns/${id}/status`, { status }); fetchReturn(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };
  const handleDelete = async () => {
    if (!confirm('Delete this return?')) return;
    try { await api.delete(`/returns/${id}`); navigate('/returns'); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  if (!ret) return null;

  const statusFlow = { draft: ['approved', 'cancelled'], approved: ['processing', 'cancelled'], processing: ['completed', 'cancelled'] };
  const nextStatuses = statusFlow[ret.status] || [];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/returns')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> Back to Returns</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{ret.reference}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[ret.status]}`}>{ret.status?.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ret.type === 'customer_return' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {ret.type === 'customer_return' ? 'Customer Return' : 'Supplier Return'}
            </span>
            {ret.contact_name && <span className="text-sm text-gray-500">{ret.contact_name}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {nextStatuses.map(s => (
            <button key={s} onClick={() => updateStatus(s)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-colors ${
                s === 'cancelled' ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' :
                s === 'completed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                'bg-blue-600 text-white hover:bg-blue-700'
              }`}>
              {s === 'cancelled' ? <XCircle size={16} /> : <CheckCircle size={16} />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          {ret.status === 'draft' && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50">
              <XCircle size={16} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Resolution', ret.resolution?.charAt(0).toUpperCase() + ret.resolution?.slice(1) || '-'], ['Total Value', `₹${parseFloat(ret.total_value || 0).toLocaleString('en-IN')}`], ['Reason', ret.reason || '-'], ['Date', new Date(ret.created_at).toLocaleDateString()]].map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">{l}</p><p className="text-lg font-semibold mt-1">{v}</p></div>
        ))}
      </div>

      {ret.notes && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700">{ret.notes}</p></div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold">Return Lines</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Condition</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Resolution</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Reason</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {(ret.lines || []).map(l => (
              <tr key={l.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3"><p className="font-medium text-sm">{l.product_name}</p><p className="text-xs text-gray-400">{l.sku}</p></td>
                <td className="px-4 py-3 text-right font-medium text-sm">{l.quantity}</td>
                <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditionColors[l.condition]}`}>{l.condition?.toUpperCase()}</span></td>
                <td className="px-4 py-3 text-center text-sm capitalize">{l.resolution || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{l.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

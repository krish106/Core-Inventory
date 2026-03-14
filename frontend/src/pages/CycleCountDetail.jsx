import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, CheckCircle, Play, XCircle } from 'lucide-react';

const statusColors = {
  planned: 'bg-gray-100 text-gray-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
};

export default function CycleCountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cc, setCc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countValues, setCountValues] = useState({});

  const fetchCC = () => {
    setLoading(true);
    api.get(`/cycle-counts/${id}`).then(r => {
      setCc(r.data);
      const vals = {};
      r.data.lines?.forEach(l => { vals[l.id] = l.counted_qty !== null ? l.counted_qty : ''; });
      setCountValues(vals);
    }).catch(() => navigate('/cycle-counts')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchCC(); }, [id]);

  const updateStatus = async (status) => {
    try { await api.patch(`/cycle-counts/${id}/status`, { status }); fetchCC(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const submitCounts = async () => {
    const lines = Object.entries(countValues)
      .filter(([_, v]) => v !== '' && v !== null)
      .map(([line_id, counted_qty]) => ({ line_id, counted_qty: parseInt(counted_qty) || 0 }));
    if (!lines.length) return alert('Enter at least one count');
    try { await api.post(`/cycle-counts/${id}/record`, { lines }); fetchCC(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  if (!cc) return null;

  const totalLines = cc.lines?.length || 0;
  const countedLines = cc.lines?.filter(l => l.counted_qty !== null).length || 0;
  const varianceLines = cc.lines?.filter(l => l.variance && l.variance !== 0).length || 0;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/cycle-counts')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> Back to Cycle Counts</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{cc.reference}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[cc.status]}`}>{cc.status?.replace('_', ' ').toUpperCase()}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{cc.warehouse_name} · {cc.count_type} count</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {cc.status === 'planned' && (
            <button onClick={() => updateStatus('in_progress')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">
              <Play size={16} /> Start Count
            </button>
          )}
          {(cc.status === 'in_progress') && (
            <button onClick={submitCounts} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700">
              <CheckCircle size={16} /> Submit Counts
            </button>
          )}
          {cc.status !== 'completed' && cc.status !== 'cancelled' && (
            <button onClick={() => updateStatus('cancelled')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Total Items', totalLines], ['Counted', `${countedLines} / ${totalLines}`], ['Variances', varianceLines], ['Status', cc.status?.replace('_', ' ')]].map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">{l}</p><p className="text-lg font-semibold mt-1 capitalize">{v}</p></div>
        ))}
      </div>

      {totalLines > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Counting Progress</span>
            <span className="text-gray-500">{Math.round((countedLines / totalLines) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-500 rounded-full h-2.5 transition-all" style={{ width: `${(countedLines / totalLines) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold">Count Lines</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Location</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">System Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Counted</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(cc.lines || []).map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3"><p className="font-medium text-sm">{l.product_name}</p><p className="text-xs text-gray-400">{l.sku}</p></td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{l.location_name}</td>
                  <td className="px-4 py-3 text-right font-medium text-sm">{l.system_qty}</td>
                  <td className="px-4 py-3 text-right">
                    {cc.status === 'in_progress' ? (
                      <input type="number" min="0"
                        value={countValues[l.id] ?? ''}
                        onChange={e => setCountValues({ ...countValues, [l.id]: e.target.value })}
                        className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right ml-auto block" />
                    ) : (
                      <span className="text-sm font-medium">{l.counted_qty !== null ? l.counted_qty : '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {l.variance !== null && l.variance !== undefined ? (
                      <span className={`text-sm font-medium ${l.variance === 0 ? 'text-emerald-600' : l.variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {l.variance > 0 ? '+' : ''}{l.variance}
                      </span>
                    ) : <span className="text-gray-400 text-sm">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

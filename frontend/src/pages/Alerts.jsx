import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import { Bell, CheckCircle, Eye } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { lastAlert } = useSocket();

  const fetchAlerts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (urgencyFilter) params.set('urgency', urgencyFilter);
    api.get(`/alerts?${params}`).then(r => { setAlerts(r.data.alerts || []); setUnread(r.data.unread_count || 0); }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(fetchAlerts, [typeFilter, urgencyFilter, lastAlert]);

  const handleMarkRead = async (id) => { await api.patch(`/alerts/${id}/read`); fetchAlerts(); };
  const handleResolve = async (id) => { await api.patch(`/alerts/${id}/resolve`); fetchAlerts(); };
  const handleMarkAllRead = async () => { await api.patch('/alerts/mark-all-read'); fetchAlerts(); };

  const urgencyStyles = { critical: 'border-l-red-500 bg-red-50', warning: 'border-l-amber-500 bg-amber-50', info: 'border-l-blue-500 bg-blue-50' };
  const urgencyBadge = { critical: 'bg-red-100 text-red-700', warning: 'bg-amber-100 text-amber-700', info: 'bg-blue-100 text-blue-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          {unread > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{unread} unread</span>}
        </div>
        <button onClick={handleMarkAllRead} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">Mark All Read</button>
      </div>
      <div className="flex gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Types</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option><option value="discrepancy">Discrepancy</option>
        </select>
        <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Urgency</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Info</option>
        </select>
      </div>
      <div className="space-y-3">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />) :
         alerts.length === 0 ? <div className="text-center py-16 text-gray-400 bg-white rounded-xl">No alerts found ✅</div> :
         alerts.map(a => (
          <div key={a.id} className={`border-l-4 rounded-xl p-4 ${urgencyStyles[a.urgency]} ${!a.is_read ? 'shadow-sm' : 'opacity-75'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge[a.urgency]}`}>{a.urgency.toUpperCase()}</span>
                  <span className="text-xs text-gray-400">{a.type.replace('_', ' ')}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{a.message}</p>
                <p className="text-xs text-gray-500 mt-1">{a.product_name && `${a.product_name} · `}{a.warehouse_name && `${a.warehouse_name} · `}{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-1">
                {!a.is_read && <button onClick={() => handleMarkRead(a.id)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg" title="Mark read"><Eye size={14} /></button>}
                <button onClick={() => handleResolve(a.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-100 rounded-lg" title="Resolve"><CheckCircle size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

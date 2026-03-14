import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, CheckCircle, XCircle, Truck, Package } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700', shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
};

export default function SalesOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [so, setSo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);
  const [shipLines, setShipLines] = useState([]);

  const fetchSO = () => {
    setLoading(true);
    api.get(`/sales-orders/${id}`).then(r => {
      setSo(r.data);
      setShipLines(r.data.lines?.map(l => ({ line_id: l.id, shipped_qty: l.shipped_qty || 0 })) || []);
    }).catch(() => navigate('/sales-orders')).finally(() => setLoading(false));
  };
  useEffect(() => { fetchSO(); }, [id]);

  const updateStatus = async (status) => {
    try { await api.patch(`/sales-orders/${id}/status`, { status }); fetchSO(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleShip = async () => {
    try { await api.post(`/sales-orders/${id}/ship`, { lines: shipLines }); setShipping(false); fetchSO(); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this sales order?')) return;
    try { await api.delete(`/sales-orders/${id}`); navigate('/sales-orders'); } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  if (!so) return null;

  const totalOrdered = so.lines?.reduce((s, l) => s + l.quantity, 0) || 0;
  const totalShipped = so.lines?.reduce((s, l) => s + (l.shipped_qty || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/sales-orders')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft size={16} /> Back to Sales Orders</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{so.reference}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[so.status]}`}>{so.status?.toUpperCase()}</span>
          </div>
          {so.customer_name && <p className="text-sm text-gray-500 mt-1">Customer: {so.customer_name}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {so.status === 'draft' && (
            <>
              <button onClick={() => updateStatus('confirmed')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"><CheckCircle size={16} /> Confirm</button>
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50"><XCircle size={16} /> Delete</button>
            </>
          )}
          {so.status === 'confirmed' && <button onClick={() => updateStatus('processing')} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm hover:bg-amber-600"><Package size={16} /> Start Processing</button>}
          {(so.status === 'confirmed' || so.status === 'processing') && (
            <button onClick={() => setShipping(true)} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700"><Truck size={16} /> Ship Order</button>
          )}
          {so.status === 'shipped' && <button onClick={() => updateStatus('delivered')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700"><CheckCircle size={16} /> Mark Delivered</button>}
          {!['cancelled','delivered'].includes(so.status) && <button onClick={() => updateStatus('cancelled')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Order Date', so.order_date ? new Date(so.order_date).toLocaleDateString() : '-'], ['Shipping Date', so.shipping_date ? new Date(so.shipping_date).toLocaleDateString() : '-'], ['Total Amount', `₹${parseFloat(so.total_amount || 0).toLocaleString('en-IN')}`], ['Fulfillment', `${totalShipped} / ${totalOrdered} units`]].map(([l, v]) => (
          <div key={l} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">{l}</p><p className="text-lg font-semibold mt-1">{v}</p></div>
        ))}
      </div>

      {totalOrdered > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between text-sm mb-2"><span className="font-medium text-gray-700">Shipping Progress</span><span className="text-gray-500">{Math.round((totalShipped / totalOrdered) * 100)}%</span></div>
          <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-purple-500 rounded-full h-2.5 transition-all" style={{ width: `${Math.min(100, (totalShipped / totalOrdered) * 100)}%` }} /></div>
        </div>
      )}

      {so.shipping_address && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500 mb-1">Shipping Address</p><p className="text-sm text-gray-700">{so.shipping_address}</p></div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold">Order Lines</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ordered</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Shipped</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {(so.lines || []).map(l => (
              <tr key={l.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3"><p className="font-medium text-sm">{l.product_name}</p><p className="text-xs text-gray-400">{l.sku}</p></td>
                <td className="px-4 py-3 text-right font-medium text-sm">{l.quantity}</td>
                <td className="px-4 py-3 text-right text-sm"><span className={l.shipped_qty >= l.quantity ? 'text-emerald-600 font-medium' : 'text-amber-600'}>{l.shipped_qty || 0}</span></td>
                <td className="px-4 py-3 text-right text-sm">₹{parseFloat(l.unit_price).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(l.line_total).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shipping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">Ship Order</h2><p className="text-sm text-gray-500 mt-1">Enter shipped quantities</p></div>
            <div className="p-6 space-y-3">
              {so.lines?.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="flex-1"><p className="text-sm font-medium">{l.product_name}</p><p className="text-xs text-gray-400">Ordered: {l.quantity}</p></div>
                  <input type="number" min="0" max={l.quantity} value={shipLines[i]?.shipped_qty || 0}
                    onChange={e => { const n = [...shipLines]; n[i] = { ...n[i], shipped_qty: parseInt(e.target.value) || 0 }; setShipLines(n); }}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm text-right" />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShipping(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleShip} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">Confirm Shipment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

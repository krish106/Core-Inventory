import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, CheckCircle, XCircle, Package } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  partially_received: 'bg-amber-100 text-amber-700',
  received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700'
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(false);
  const [receiveLines, setReceiveLines] = useState([]);

  const fetchPO = () => {
    setLoading(true);
    api.get(`/purchase-orders/${id}`).then(r => {
      setPo(r.data);
      setReceiveLines(r.data.lines?.map(l => ({ line_id: l.id, received_qty: l.received_qty || 0 })) || []);
    }).catch(() => navigate('/purchase-orders')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPO(); }, [id]);

  const updateStatus = async (status) => {
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status });
      fetchPO();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleReceive = async () => {
    try {
      await api.post(`/purchase-orders/${id}/receive`, { lines: receiveLines });
      setReceiving(false);
      fetchPO();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to receive');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await api.delete(`/purchase-orders/${id}`);
      navigate('/purchase-orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  if (loading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />)}</div>;
  if (!po) return null;

  const totalOrdered = po.lines?.reduce((s, l) => s + l.ordered_qty, 0) || 0;
  const totalReceived = po.lines?.reduce((s, l) => s + (l.received_qty || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/purchase-orders')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to Purchase Orders
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{po.reference}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[po.status]}`}>
              {po.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {po.supplier_name && <p className="text-sm text-gray-500 mt-1">Supplier: {po.supplier_name}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {po.status === 'draft' && (
            <>
              <button onClick={() => updateStatus('confirmed')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors">
                <CheckCircle size={16} /> Confirm
              </button>
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors">
                <XCircle size={16} /> Delete
              </button>
            </>
          )}
          {(po.status === 'confirmed' || po.status === 'partially_received') && (
            <button onClick={() => setReceiving(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition-colors">
              <Package size={16} /> Receive Goods
            </button>
          )}
          {po.status !== 'cancelled' && po.status !== 'received' && (
            <button onClick={() => updateStatus('cancelled')} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Order Date', po.order_date ? new Date(po.order_date).toLocaleDateString() : '-'],
          ['Expected Date', po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'],
          ['Total Amount', `₹${parseFloat(po.total_amount || 0).toLocaleString('en-IN')}`],
          ['Progress', `${totalReceived} / ${totalOrdered} units`]
        ].map(([label, val]) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-semibold mt-1">{val}</p>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {totalOrdered > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Receiving Progress</span>
            <span className="text-gray-500">{Math.round((totalReceived / totalOrdered) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-emerald-500 rounded-full h-2.5 transition-all duration-500" style={{ width: `${Math.min(100, (totalReceived / totalOrdered) * 100)}%` }} />
          </div>
        </div>
      )}

      {po.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{po.notes}</p>
        </div>
      )}

      {/* Order Lines */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold">Order Lines</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ordered</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Received</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(po.lines || []).map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{l.product_name}</p>
                    <p className="text-xs text-gray-400">{l.sku}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-sm">{l.ordered_qty}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className={l.received_qty >= l.ordered_qty ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                      {l.received_qty || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">₹{parseFloat(l.unit_price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(l.line_total).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Modal */}
      {receiving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Receive Goods</h2>
              <p className="text-sm text-gray-500 mt-1">Enter the quantities received for each line</p>
            </div>
            <div className="p-6 space-y-3">
              {po.lines?.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{l.product_name}</p>
                    <p className="text-xs text-gray-400">Ordered: {l.ordered_qty}</p>
                  </div>
                  <input type="number" min="0" max={l.ordered_qty}
                    value={receiveLines[i]?.received_qty || 0}
                    onChange={e => {
                      const newLines = [...receiveLines];
                      newLines[i] = { ...newLines[i], received_qty: parseInt(e.target.value) || 0 };
                      setReceiveLines(newLines);
                    }}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm text-right" />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setReceiving(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleReceive} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">Confirm Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

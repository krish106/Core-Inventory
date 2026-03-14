import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, ShoppingBag } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700', shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700'
};

export default function SalesOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    customer_id: '', shipping_address: '', shipping_date: '', notes: '',
    lines: [{ product_id: '', quantity: 1, unit_price: 0 }]
  });

  const fetchOrders = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    api.get(`/sales-orders${params}`).then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter]);
  useEffect(() => {
    api.get('/contacts').then(r => setCustomers((r.data || []).filter(c => c.type === 'customer' || c.type === 'both'))).catch(() => {});
    api.get('/products').then(r => setProducts(r.data?.products || r.data || [])).catch(() => {});
  }, []);

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', quantity: 1, unit_price: 0 }] });
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, val) => { const l = [...form.lines]; l[i] = { ...l[i], [field]: val }; setForm({ ...form, lines: l }); };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/sales-orders', form);
      setShowCreate(false);
      setForm({ customer_id: '', shipping_address: '', shipping_date: '', notes: '', lines: [{ product_id: '', quantity: 1, unit_price: 0 }] });
      fetchOrders();
      navigate(`/sales-orders/${res.data.id}`);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const total = form.lines.reduce((s, l) => s + (l.quantity * l.unit_price), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer orders and shipments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={18} /> New Sales Order
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Order Date</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <ShoppingBag className="mx-auto mb-2 text-gray-300" size={32} />No sales orders found</td></tr>
              ) : orders.map(so => (
                <tr key={so.id} onClick={() => navigate(`/sales-orders/${so.id}`)} className="hover:bg-gray-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{so.reference}</td>
                  <td className="px-4 py-3 text-sm">{so.customer_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{so.order_date ? new Date(so.order_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(so.total_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center text-sm">{so.line_count}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[so.status]}`}>{so.status?.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-bold text-gray-900">New Sales Order</h2></div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Customer</label>
                  <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"><option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Shipping Date</label>
                  <input type="date" value={form.shipping_date} onChange={e => setForm({ ...form, shipping_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Shipping Address</label>
                <textarea value={form.shipping_address} onChange={e => setForm({ ...form, shipping_address: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700">Order Lines</label>
                  <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Line</button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <select value={line.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)} required
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm">
                        <option value="">Select Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select>
                      <input type="number" min="1" value={line.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value) || 1)} required
                        className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Qty" />
                      <input type="number" min="0" step="0.01" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Price" />
                      {form.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">✕</button>}
                    </div>
                  ))}
                </div>
                {total > 0 && <p className="text-right text-sm font-medium text-gray-700 mt-2">Total: ₹{total.toLocaleString('en-IN')}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

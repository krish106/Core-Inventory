import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { Plus, ShoppingCart, Search } from 'lucide-react';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  partially_received: 'bg-amber-100 text-amber-700',
  received: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700'
};

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '', lines: [{ product_id: '', ordered_qty: 1, unit_price: 0 }] });

  const fetchOrders = () => {
    setLoading(true);
    const params = filter ? `?status=${filter}` : '';
    api.get(`/purchase-orders${params}`).then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [filter]);
  useEffect(() => {
    api.get('/contacts').then(r => setSuppliers((r.data || []).filter(c => c.type === 'supplier' || c.type === 'both'))).catch(() => {});
    api.get('/products').then(r => setProducts(r.data?.products || r.data || [])).catch(() => {});
  }, []);

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', ordered_qty: 1, unit_price: 0 }] });
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, val) => {
    const newLines = [...form.lines];
    newLines[i] = { ...newLines[i], [field]: val };
    setForm({ ...form, lines: newLines });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/purchase-orders', form);
      setShowCreate(false);
      setForm({ supplier_id: '', expected_date: '', notes: '', lines: [{ product_id: '', ordered_qty: 1, unit_price: 0 }] });
      fetchOrders();
      navigate(`/purchase-orders/${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create PO');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier orders and procurement</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={18} /> New Purchase Order
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'draft', 'confirmed', 'partially_received', 'received', 'cancelled'].map(s => (
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Order Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Expected</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <ShoppingCart className="mx-auto mb-2 text-gray-300" size={32} />
                  No purchase orders found
                </td></tr>
              ) : orders.map(po => (
                <tr key={po.id} onClick={() => navigate(`/purchase-orders/${po.id}`)} className="hover:bg-gray-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">{po.reference}</td>
                  <td className="px-4 py-3 text-sm">{po.supplier_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{po.order_date ? new Date(po.order_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">₹{parseFloat(po.total_amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center text-sm">{po.line_count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[po.status]}`}>
                      {po.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">New Purchase Order</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier</label>
                  <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Expected Date</label>
                  <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                      <input type="number" min="1" value={line.ordered_qty} onChange={e => updateLine(i, 'ordered_qty', parseInt(e.target.value) || 1)} required
                        className="w-20 px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Qty" />
                      <input type="number" min="0" step="0.01" value={line.unit_price} onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Price" />
                      {form.lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)} className="px-2 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm">✕</button>
                      )}
                    </div>
                  ))}
                </div>
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

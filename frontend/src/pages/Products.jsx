import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { Plus, Search, X } from 'lucide-react';

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', sku:'', category_id:'', unit_of_measure:'unit', cost_price:'', selling_price:'', reorder_point:10, barcode:'', description:'', initial_stock:'', location_id:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (catFilter) params.set('category_id', catFilter);
    if (statusFilter) params.set('stock_status', statusFilter);
    api.get(`/products?${params}`).then(r => setProducts(r.data.products || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { api.get('/products/categories').then(r => setCategories(r.data)); api.get('/locations').then(r => setLocations(r.data)); }, []);
  useEffect(() => { const t = setTimeout(fetchProducts, 300); return () => clearTimeout(t); }, [search, catFilter, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/products', { ...form, cost_price: parseFloat(form.cost_price)||0, selling_price: parseFloat(form.selling_price)||0, initial_stock: parseInt(form.initial_stock)||0 });
      setShowModal(false); setForm({ name:'', sku:'', category_id:'', unit_of_measure:'unit', cost_price:'', selling_price:'', reorder_point:10, barcode:'', description:'', initial_stock:'', location_id:'' }); fetchProducts();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create product'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all">
          <Plus size={16} /> New Product
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm">
          <option value="">All Status</option><option value="low_stock">Low Stock</option><option value="out_of_stock">Out of Stock</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">SKU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Category</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">On Hand</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Free to Ship</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              )) : products.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No products found. Create your first product.</td></tr>
              ) : products.map(p => (
                <tr key={p.id} onClick={() => navigate(`/products/${p.id}`)} className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-gray-900 text-sm">{p.name}</p></td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{p.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{p.category_name || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sm">{p.on_hand}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 hidden md:table-cell">{p.free_to_ship}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={p.stock_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Product</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
                  <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select value={form.unit_of_measure} onChange={e => setForm({...form, unit_of_measure: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="unit">Unit</option><option value="kg">Kg</option><option value="litre">Litre</option><option value="metre">Metre</option><option value="box">Box</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Cost Price</label>
                  <input type="number" step="0.01" value={form.cost_price} onChange={e => setForm({...form, cost_price: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Selling Price</label>
                  <input type="number" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Reorder Point</label>
                  <input type="number" value={form.reorder_point} onChange={e => setForm({...form, reorder_point: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Barcode</label>
                <input type="text" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input type="number" value={form.initial_stock} onChange={e => setForm({...form, initial_stock: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                  <select value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="">Select</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} → {l.name}</option>)}
                  </select></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useSocket } from '../hooks/useSocket';
import ExportButton from '../components/ExportButton';
import { Package, AlertTriangle, TrendingDown, ArrowDownToLine, ArrowUpFromLine, Truck, DollarSign, Calendar } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Filter } from 'lucide-react';

function KPICard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    yellow: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    green: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [deadStock, setDeadStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const { stockUpdated } = useSocket();

  // Chart states
  const [days, setDays] = useState(30);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [warehouseData, setWarehouseData] = useState([]);

  // Dynamic filters (PDF requirement)
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch filter options
  useEffect(() => {
    api.get('/warehouses').then(r => setWarehouses(r.data || [])).catch(() => {});
    api.get('/products/categories').then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/dashboard/reorder-suggestions'),
      api.get(`/analytics/dead-stock?days=${days}`),
      api.get(`/analytics/stock-trend?days=${days}`),
      api.get(`/analytics/category-breakdown`),
      api.get(`/analytics/warehouse-comparison`)
    ]).then(([kRes, sRes, deadRes, trendRes, catRes, whRes]) => {
      setKpis(kRes.data.kpis);
      setAlerts(kRes.data.recent_alerts || []);
      setSuggestions(sRes.data || []);
      setDeadStock(deadRes.data.summary);
      setTrendData(trendRes.data || []);
      setCategoryData(catRes.data || []);
      setWarehouseData(whRes.data || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(fetchData, [stockUpdated, days]);

  if (loading && !kpis) return (
    <div className="space-y-4">
      <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[...Array(7)].map((_, i) => <div key={`pulse-${i}`} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  const urgencyBadge = { CRITICAL: 'bg-red-100 text-red-700', ORDER_NOW: 'bg-orange-100 text-orange-700', ORDER_SOON: 'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
              showFilters || filterType || filterStatus || filterWarehouse || filterCategory
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Filter size={14} /> Filters
            {(filterType || filterStatus || filterWarehouse || filterCategory) && (
              <span className="w-5 h-5 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">
                {[filterType, filterStatus, filterWarehouse, filterCategory].filter(Boolean).length}
              </span>
            )}
          </button>
          <ExportButton endpoint="/reports/stock" filename="stock-report" label="Export" />
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <Calendar size={16} className="text-gray-400" />
            <select value={days} onChange={e => setDays(Number(e.target.value))}
              className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer">
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Document Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              <option value="receipt">Receipts</option>
              <option value="delivery">Deliveries</option>
              <option value="internal_transfer">Internal Transfers</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Warehouse</label>
            <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Category</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {(filterType || filterStatus || filterWarehouse || filterCategory) && (
            <div className="col-span-full flex justify-end">
              <button onClick={() => { setFilterType(''); setFilterStatus(''); setFilterWarehouse(''); setFilterCategory(''); }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">Clear All Filters</button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KPICard icon={Package} label="Products in Stock" value={kpis?.products_in_stock || 0} color="blue" />
        <KPICard icon={AlertTriangle} label="Low Stock" value={kpis?.low_stock_items || 0} color="yellow" />
        <KPICard icon={TrendingDown} label="Dead Stock" value={`₹${parseFloat(deadStock?.total_dead_stock_value || 0).toLocaleString('en-IN')}`} color="red" />
        <KPICard icon={TrendingDown} label="Out of Stock" value={kpis?.out_of_stock_items || 0} color="red" />
        <KPICard icon={ArrowDownToLine} label="Pending Receipts" value={kpis?.pending_receipts || 0} color="green" />
        <KPICard icon={ArrowUpFromLine} label="Pending Deliveries" value={kpis?.pending_deliveries || 0} color="purple" />
        <KPICard icon={Truck} label="Pending Transfers" value={kpis?.pending_transfers || 0} color="indigo" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Stock Value</h3>
        </div>
        <p className="text-3xl font-bold text-emerald-600">₹{(kpis?.total_stock_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Stock Movement Trend</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Incoming vs outgoing quantities</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="trend_date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)' }} />
                <Legend wrapperStyle={{ paddingTop: '16px' }} />
                <Area type="monotone" dataKey="incoming" name="Incoming" stroke="#10b981" fill="url(#gIn)" strokeWidth={2.5} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="outgoing" name="Outgoing" stroke="#ef4444" fill="url(#gOut)" strokeWidth={2.5} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Value by Category</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Inventory distribution</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="stock_value" nameKey="category_name" animationDuration={1200}>
                  {categoryData.map((_, i) => (<Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Warehouse Comparison</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="warehouse_name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)' }} />
                <Legend wrapperStyle={{ paddingTop: '16px' }} />
                <Bar yAxisId="left" dataKey="item_count" name="Unique Items" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="stock_value" name="Total Value (₹)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reorder Suggestions</h3>
          {suggestions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-6 text-center">All stock levels healthy ✅</p>
          ) : (
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
              {suggestions.map((s, idx) => (
                <div key={`${s.id}-${idx}`} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.sku} · Stock: {s.current_stock}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge[s.urgency]}`}>{s.urgency?.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import api from '../api/axios';
import { TrendingDown, Activity, BarChart3, Target, Calendar } from 'lucide-react';

const tabs = [
  { id: 'dead', label: 'Dead Stock', icon: TrendingDown },
  { id: 'slow', label: 'Slow Moving', icon: Activity },
  { id: 'abc', label: 'ABC Analysis', icon: BarChart3 },
  { id: 'turnover', label: 'Turnover', icon: Activity },
  { id: 'forecast', label: 'Forecast', icon: Target },
];

export default function Analytics() {
  const [tab, setTab] = useState('dead');
  const [days, setDays] = useState(30);
  const [deadData, setDeadData] = useState(null);
  const [slowData, setSlowData] = useState(null);
  const [abcData, setAbcData] = useState(null);
  const [turnoverData, setTurnoverData] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoints = {
      dead: () => api.get(`/analytics/dead-stock?days=${days}`).then(r => setDeadData(r.data)),
      slow: () => api.get(`/analytics/slow-moving?days=${days}`).then(r => setSlowData(r.data)),
      abc: () => api.get(`/analytics/abc-classification?days=${days}`).then(r => setAbcData(r.data)),
      turnover: () => api.get(`/analytics/turnover-ratio?days=${days}`).then(r => setTurnoverData(r.data)),
      forecast: () => api.get(`/analytics/demand-forecast?days=${days}`).then(r => setForecastData(r.data)),
    };
    endpoints[tab]?.().catch(console.error).finally(() => setLoading(false));
  }, [tab, days]);

  const classColors = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-amber-100 text-amber-700', C: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100">
          <Calendar size={16} className="text-gray-400" />
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer">
            <option value={30}>Last 30 Days</option><option value={60}>Last 60 Days</option><option value={90}>Last 90 Days</option><option value={180}>Last 180 Days</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Dead Stock Tab */}
          {tab === 'dead' && deadData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Dead Items', deadData.summary.total_dead_stock_items], ['Dead Stock Value', `₹${parseFloat(deadData.summary.total_dead_stock_value || 0).toLocaleString('en-IN')}`], ['Total Inventory', `₹${parseFloat(deadData.summary.total_inventory_value || 0).toLocaleString('en-IN')}`], ['% of Inventory', `${deadData.summary.percentage_of_total_inventory}%`]].map(([l, v]) => (
                  <div key={l} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">{l}</p><p className="text-lg font-semibold mt-1">{v}</p></div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Days Idle</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(deadData.items || []).map(i => (
                    <tr key={i.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3"><p className="font-medium text-sm">{i.product_name}</p><p className="text-xs text-gray-400">{i.sku}</p></td>
                      <td className="px-4 py-3 text-right text-sm">{i.current_stock}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(i.stock_value).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-sm"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{i.days_idle}</span></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </div>
          )}

          {/* Slow Moving Tab */}
          {tab === 'slow' && slowData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Slow Items</p><p className="text-lg font-semibold mt-1">{slowData.summary.total_slow_items}</p></div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Capital Locked</p><p className="text-lg font-semibold mt-1">₹{parseFloat(slowData.summary.total_slow_value || 0).toLocaleString('en-IN')}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Movements</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Value</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(slowData.items || []).map(i => (
                    <tr key={i.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3"><p className="font-medium text-sm">{i.product_name}</p><p className="text-xs text-gray-400">{i.sku}</p></td>
                      <td className="px-4 py-3 text-right text-sm"><span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{i.movement_count}</span></td>
                      <td className="px-4 py-3 text-right text-sm">{i.current_stock}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(i.stock_value).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </div>
          )}

          {/* ABC Classification Tab */}
          {tab === 'abc' && abcData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">Total Revenue</p><p className="text-lg font-semibold mt-1">₹{parseFloat(abcData.summary.total_revenue || 0).toLocaleString('en-IN')}</p></div>
                {['A', 'B', 'C'].map(cls => (
                  <div key={cls} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${classColors[cls]}`}>{cls}</span><p className="text-xs text-gray-500">Class</p></div>
                    <p className="text-lg font-semibold mt-1">{abcData.summary[cls]?.count || 0} items</p>
                    <p className="text-xs text-gray-500">₹{parseFloat(abcData.summary[cls]?.revenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Sold</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Cum %</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(abcData.items || []).map(i => (
                    <tr key={i.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${classColors[i.classification]}`}>{i.classification}</span></td>
                      <td className="px-4 py-3"><p className="font-medium text-sm">{i.product_name}</p><p className="text-xs text-gray-400">{i.sku}</p></td>
                      <td className="px-4 py-3 text-right text-sm font-medium">₹{parseFloat(i.revenue).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right text-sm hidden md:table-cell">{i.total_sold}</td>
                      <td className="px-4 py-3 text-right text-sm hidden md:table-cell">{i.cumulative_pct}%</td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </div>
          )}

          {/* Turnover Tab */}
          {tab === 'turnover' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">COGS</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Turnover</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Days in Inv</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {turnoverData.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3"><p className="font-medium text-sm">{i.product_name}</p><p className="text-xs text-gray-400">{i.sku}</p></td>
                    <td className="px-4 py-3 text-right text-sm">{i.current_stock}</td>
                    <td className="px-4 py-3 text-right text-sm">₹{parseFloat(i.cogs).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${i.turnover_ratio >= 3 ? 'bg-emerald-100 text-emerald-700' : i.turnover_ratio >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{i.turnover_ratio}x</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{i.days_in_inventory === 999 ? '∞' : i.days_in_inventory}d</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}

          {/* Forecast Tab */}
          {tab === 'forecast' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full"><thead><tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Daily Demand</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Days Left</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">30d Forecast</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reorder</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {forecastData.map(i => (
                  <tr key={i.id} className={`hover:bg-gray-50/50 ${i.needs_reorder ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3"><p className="font-medium text-sm">{i.product_name}</p><p className="text-xs text-gray-400">{i.sku}</p></td>
                    <td className="px-4 py-3 text-right text-sm">{i.current_stock}</td>
                    <td className="px-4 py-3 text-right text-sm">{i.daily_demand}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${i.days_of_stock <= 7 ? 'bg-red-100 text-red-700' : i.days_of_stock <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {i.days_of_stock === 999 ? '∞' : i.days_of_stock}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{i.forecast_demand}</td>
                    <td className="px-4 py-3 text-center">
                      {i.needs_reorder ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Order {i.suggested_order}</span> : <span className="text-emerald-500 text-xs">✓ OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

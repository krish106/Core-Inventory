import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import api from '../../api/axios';
import AIAssistant from '../AIAssistant';
import VoiceControl from '../VoiceControl';
import DarkModeToggle from '../DarkModeToggle';
import {
  LayoutDashboard, Package, ClipboardCheck, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, History, Warehouse, Settings, LogOut, User, Bell, Menu, X, BarChart,
  ShoppingCart, RotateCcw, ClipboardList, Layers, ShoppingBag
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/stock', icon: ClipboardCheck, label: 'Stock' },
  { to: '/receipts', icon: ArrowDownToLine, label: 'Receipts' },
  { to: '/deliveries', icon: ArrowUpFromLine, label: 'Deliveries' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { to: '/adjustments', icon: ClipboardList, label: 'Adjustments' },
  { to: '/move-history', icon: History, label: 'Move History' },
  { to: '/warehouses', icon: Warehouse, label: 'Warehouses' },
  { to: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders' },
  { to: '/sales-orders', icon: ShoppingBag, label: 'Sales Orders' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
  { to: '/batch-tracking', icon: Layers, label: 'Batch Tracking' },
  { to: '/cycle-counts', icon: ClipboardList, label: 'Cycle Counts' },
  { to: '/analytics', icon: BarChart, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { isConnected, lastAlert } = useSocket();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.get('/alerts?is_read=false').then(r => setAlertCount(r.data.unread_count || 0)).catch(() => {});
  }, [lastAlert]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CoreInventory</h1>
          <span className={`ml-auto w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
              }`
            }>
            <Icon className="w-4.5 h-4.5" size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl flex flex-col animate-slideIn">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm transition-colors duration-300">
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <VoiceControl />
            <DarkModeToggle />
            <button onClick={() => navigate('/alerts')} className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <Bell size={20} />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Assistant (global) */}
      <AIAssistant />
    </div>
  );
}

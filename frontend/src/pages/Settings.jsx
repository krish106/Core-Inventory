import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Warehouse, User, ClipboardEdit, LogOut } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <button onClick={() => navigate('/warehouses')} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
          <Warehouse className="w-5 h-5 text-blue-600" />
          <div><p className="font-medium text-gray-900 dark:text-gray-100">Warehouse Management</p><p className="text-sm text-gray-500 dark:text-gray-400">Manage warehouses and locations</p></div>
        </button>
        <button onClick={() => navigate('/move-history')} className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
          <ClipboardEdit className="w-5 h-5 text-emerald-600" />
          <div><p className="font-medium text-gray-900 dark:text-gray-100">Inventory Adjustments</p><p className="text-sm text-gray-500 dark:text-gray-400">View stock movement history</p></div>
        </button>
      </div>
      <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm transition-colors">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Stock from './pages/Stock';
import Receipts from './pages/Receipts';
import ReceiptDetail from './pages/ReceiptDetail';
import Deliveries from './pages/Deliveries';
import DeliveryDetail from './pages/DeliveryDetail';
import Transfers from './pages/Transfers';
import TransferDetail from './pages/TransferDetail';
import MoveHistory from './pages/MoveHistory';
import Adjustments from './pages/Adjustments';
import Warehouses from './pages/Warehouses';
import Alerts from './pages/Alerts';
import Analytics from './pages/Analytics';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Returns from './pages/Returns';
import ReturnDetail from './pages/ReturnDetail';
import BatchTracking from './pages/BatchTracking';
import CycleCounts from './pages/CycleCounts';
import CycleCountDetail from './pages/CycleCountDetail';
import SalesOrders from './pages/SalesOrders';
import SalesOrderDetail from './pages/SalesOrderDetail';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="stock" element={<Stock />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="receipts/:id" element={<ReceiptDetail />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="deliveries/:id" element={<DeliveryDetail />} />
            <Route path="transfers" element={<Transfers />} />
            <Route path="transfers/:id" element={<TransferDetail />} />
            <Route path="move-history" element={<MoveHistory />} />
            <Route path="adjustments" element={<Adjustments />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="returns" element={<Returns />} />
            <Route path="returns/:id" element={<ReturnDetail />} />
            <Route path="batch-tracking" element={<BatchTracking />} />
            <Route path="cycle-counts" element={<CycleCounts />} />
            <Route path="cycle-counts/:id" element={<CycleCountDetail />} />
            <Route path="sales-orders" element={<SalesOrders />} />
            <Route path="sales-orders/:id" element={<SalesOrderDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

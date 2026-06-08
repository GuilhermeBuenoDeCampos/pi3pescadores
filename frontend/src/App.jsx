import { Routes, Route } from 'react-router-dom';

import Home from './pages/Home';
import ProductPage from './pages/ProductPage';
import StockManagement from './pages/StockManagement';
import SalesManagement from './pages/SalesManagement';
import CartPage from './pages/CartPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import FaturamentoCompleto from './pages/FaturamentoCompleto';
import LeadtimeDetalhado from './pages/LeadtimeDetalhado';
import OrderDetailsPage from './pages/OrderDetailsPage';
import ProtectedRoute from './components/ProtectedRoute';
import styles from './App.module.css';
import CheckoutAddressPage from './pages/CheckoutAddressPage';
import CheckoutShippingPage from './pages/CheckoutShippingPage';
import CheckoutPaymentPage from './pages/CheckoutPaymentPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';

function App() {
  return (
    <div className={styles.appWrapper}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/produto/:id" element={<ProductPage />} />
        <Route path="/produto-nome/:nome" element={<ProductPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route
          path="/checkout/address"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/login">
              <CheckoutAddressPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/shipping"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/login">
              <CheckoutShippingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/payment"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/login">
              <CheckoutPaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout/success"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/login">
              <CheckoutSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meus-pedidos"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/">
              <AccountPage type="orders" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meus-pedidos/:id"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/">
              <OrderDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meus-enderecos"
          element={
            <ProtectedRoute roles={['cliente']} redirectTo="/">
              <AccountPage type="addresses" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/estoque"
          element={
            <ProtectedRoute roles={['admin', 'funcionario']}>
              <StockManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendas"
          element={
            <ProtectedRoute roles={['admin', 'funcionario']}>
              <SalesManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faturamento-completo"
          element={
            <ProtectedRoute roles={['admin', 'funcionario']}>
              <FaturamentoCompleto />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leadtime"
          element={
            <ProtectedRoute roles={['admin', 'funcionario']}>
              <LeadtimeDetalhado />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;

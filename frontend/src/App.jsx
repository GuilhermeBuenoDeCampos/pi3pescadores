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
import CartAbandonmentDashboard from './pages/CartAbandonmentDashboard';
import FaturamentoCompleto from './pages/FaturamentoCompleto';
import LeadtimeDetalhado from './pages/LeadtimeDetalhado';
import SatisfacaoDetalhada from './pages/SatisfacaoDetalhada';
import ComportamentoDetalhado from './pages/ComportamentoDetalhado';
import CrossSellDetalhado from './pages/CrossSellDetalhado';
import PalavrasPesquisadasDetalhado from './pages/PalavrasPesquisadasDetalhado';
import OrderDetailsPage from './pages/OrderDetailsPage';
import ProtectedRoute from './components/ProtectedRoute';
import useUserTracking from './hooks/useUserTracking';
import styles from './App.module.css';

function TrackingLayer() {
  useUserTracking({ enabled: true });
  return null;
}

function App() {
  return (
    <div className={styles.appWrapper}>
      <TrackingLayer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/produto/:id" element={<ProductPage />} />
        <Route path="/produto-nome/:nome" element={<ProductPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/meus-pedidos" element={<AccountPage type="orders" />} />
        <Route path="/meus-pedidos/:id" element={<OrderDetailsPage />} />
        <Route
          path="/meus-enderecos"
          element={
            <ProtectedRoute>
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
          path="/admin/carrinho-abandono"
          element={
            <ProtectedRoute roles={['admin']}>
              <CartAbandonmentDashboard />
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
        <Route
          path="/admin/satisfacao"
          element={
            <ProtectedRoute roles={['admin']}>
              <SatisfacaoDetalhada />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/comportamento"
          element={
            <ProtectedRoute roles={['admin', 'funcionario']}>
              <ComportamentoDetalhado />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/cross-sell"
          element={
            <ProtectedRoute roles={['admin', 'funcionario']}>
              <CrossSellDetalhado />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/palavras-pesquisadas"
          element={
            <ProtectedRoute roles={['admin']}>
              <PalavrasPesquisadasDetalhado />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;

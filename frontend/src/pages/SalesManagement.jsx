import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiSearch, FiShoppingBag, FiTruck, FiX } from 'react-icons/fi';
import {
  fetchTodosPedidos,
  fetchPedidoAdmin,
  atualizarStatusPedido,
} from '../services/api';
import AdminSidebar from '../components/AdminSidebar';
import styles from './SalesManagement.module.css';

const ORDER_FLOW = ['pendente', 'confirmado', 'preparando', 'enviado', 'concluido'];
const STATUS_LABELS = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const SalesManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';
  const [pedidos, setPedidos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState(
    ['pendente', 'confirmado', 'preparando', 'enviado', 'concluido', 'cancelado'].includes(initialStatus)
      ? initialStatus
      : ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const statuses = [...ORDER_FLOW, 'cancelado'];

  const loadPedidos = async (page = 1, status = '', search = '') => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: 10,
      };

      if (status) params.status = status;
      if (search) params.search = search;

      const result = await fetchTodosPedidos(params);
      setPedidos(result.data || []);
      setPagination(result.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      setError(err.message || 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const loadPedidoDetalhe = async (pedidoId) => {
    try {
      setLoadingDetalhe(true);
      const detalhe = await fetchPedidoAdmin(pedidoId);
      setPedidoDetalhe(detalhe);
    } catch (err) {
      console.error('Erro ao carregar detalhes do pedido:', err);
      setError(err.message || 'Erro ao carregar detalhes do pedido');
    } finally {
      setLoadingDetalhe(false);
    }
  };

  useEffect(() => {
    loadPedidos(1, filtroStatus, searchTerm);

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadPedidos(pagination.page, filtroStatus, searchTerm);
      }
    };
    const refreshInterval = window.setInterval(refreshWhenVisible, 30000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  const handleFiltroStatus = (status) => {
    setFiltroStatus(status);
    loadPedidos(1, status, searchTerm);
  };

  const handleSearch = () => {
    loadPedidos(1, filtroStatus, searchTerm);
  };

  const handleStatusChange = async (pedidoId, novoStatus) => {
    try {
      setUpdatingStatusId(pedidoId);
      setError(null);
      await atualizarStatusPedido(pedidoId, novoStatus);
      await loadPedidos(pagination.page, filtroStatus, searchTerm);
      if (selectedPedido?.id === pedidoId) {
        await loadPedidoDetalhe(pedidoId);
      }
    } catch (err) {
      setError(err.message || 'Erro ao atualizar status do pedido');
      await loadPedidos(pagination.page, filtroStatus, searchTerm);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getNextStatus = (status) => {
    const currentIndex = ORDER_FLOW.indexOf(status);
    return currentIndex >= 0 ? ORDER_FLOW[currentIndex + 1] || null : null;
  };

  const handleVerDetalhes = (pedido) => {
    setSelectedPedido(pedido);
    loadPedidoDetalhe(pedido.id);
  };

  const handleFecharModal = () => {
    setSelectedPedido(null);
    setPedidoDetalhe(null);
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pendente: '#f59e0b',
      confirmado: '#3b82f6',
      preparando: '#8b5cf6',
      enviado: '#06b6d4',
      concluido: '#10b981',
      cancelado: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const pendingOrders = pedidos.filter((pedido) => pedido.status === 'pendente').length;
  const confirmedOrders = pedidos.filter((pedido) => pedido.status === 'confirmado').length;
  const preparingOrders = pedidos.filter((pedido) => pedido.status === 'preparando').length;
  const shippedOrders = pedidos.filter((pedido) => pedido.status === 'enviado').length;
  const completedOrders = pedidos.filter((pedido) => pedido.status === 'concluido').length;
  const cancelledOrders = pedidos.filter((pedido) => pedido.status === 'cancelado').length;

  return (
    <div className={styles.container}>
      <AdminSidebar />

      <div className={styles.mainArea}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleContainer}>
            <p className={styles.breadcrumb}>Painel / Vendas</p>
            <h1>Gerenciamento de Vendas</h1>
            <div className={styles.subtitle}>Acompanhe pedidos, clientes e andamento das entregas.</div>
          </div>

        </header>

        {/* Main Content */}
        <div className={styles.content}>
          <section className={styles.dashboardCards} aria-label="Indicadores de vendas">
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconBlue}`}><FiShoppingBag /></div>
              <div><h3>Pedidos na pagina</h3><strong>{pedidos.length}</strong><span>Resultados carregados</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconYellow}`}><FiClock /></div>
              <div><h3>Pendentes</h3><strong>{pendingOrders}</strong><span>Aguardando confirmacao</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconBlue}`}><FiCheckCircle /></div>
              <div><h3>Confirmados</h3><strong>{confirmedOrders}</strong><span>Pagamento confirmado</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconTeal}`}><FiPackage /></div>
              <div><h3>Preparando</h3><strong>{preparingOrders}</strong><span>Separacao em andamento</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconTeal}`}><FiTruck /></div>
              <div><h3>Enviados</h3><strong>{shippedOrders}</strong><span>A caminho do cliente</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconGreen}`}><FiCheckCircle /></div>
              <div><h3>Concluidos</h3><strong>{completedOrders}</strong><span>Pedidos finalizados</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconRed}`}><FiX /></div>
              <div><h3>Cancelados</h3><strong>{cancelledOrders}</strong><span>Pedidos interrompidos</span></div>
            </article>
          </section>

          {/* Search Bar */}
          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <FiSearch size={18} />
              <input
                type="text"
                placeholder="Pesquisar por número do pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className={styles.searchInput}
              />
              <button onClick={handleSearch} className={styles.searchBtn}>
                Buscar
              </button>
            </div>
          </div>

          {/* Status Filters */}
          <div className={styles.filtersSection}>
            <span className={styles.filtersLabel}>Filtrar por Status:</span>
            <button
              className={`${styles.filterBtn} ${filtroStatus === '' ? styles.filterBtnActive : ''}`}
              onClick={() => handleFiltroStatus('')}
            >
              Todos
            </button>
            {statuses.map((status) => (
              <button
                key={status}
                className={`${styles.filterBtn} ${filtroStatus === status ? styles.filterBtnActive : ''}`}
                onClick={() => handleFiltroStatus(status)}
                style={filtroStatus === status ? { backgroundColor: getStatusBadgeColor(status), color: 'white' } : {}}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className={styles.loadingBox}>
              Carregando pedidos...
            </div>
          ) : (
            <>
              {/* Orders Table */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nº Pedido</th>
                      <th>Cliente</th>
                      <th>Itens</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Data</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 ? (
                      <tr>
                        <td colSpan="7" className={styles.emptyMessage}>
                          Nenhum pedido encontrado
                        </td>
                      </tr>
                    ) : (
                      pedidos.map((pedido) => (
                        <tr key={pedido.id}>
                          <td className={styles.pedidoNum}>{pedido.numero_pedido}</td>
                          <td>{pedido.nome_cliente || 'N/A'}</td>
                          <td>{pedido.itens?.length || 0}</td>
                          <td>R$ {parseFloat(pedido.valor_total || 0).toFixed(2)}</td>
                          <td>
                            <div className={styles.statusActions}>
                              <span
                                className={styles.statusBadge}
                                style={{
                                  borderColor: getStatusBadgeColor(pedido.status),
                                  color: getStatusBadgeColor(pedido.status),
                                }}
                              >
                                {STATUS_LABELS[pedido.status] || pedido.status}
                              </span>
                              {getNextStatus(pedido.status) && (
                                <button
                                  type="button"
                                  className={styles.advanceStatusBtn}
                                  onClick={() => handleStatusChange(pedido.id, getNextStatus(pedido.status))}
                                  disabled={updatingStatusId === pedido.id}
                                  aria-label={`Marcar pedido ${pedido.numero_pedido} como ${STATUS_LABELS[getNextStatus(pedido.status)]}`}
                                >
                                  {updatingStatusId === pedido.id
                                    ? 'Atualizando...'
                                    : `Marcar como ${STATUS_LABELS[getNextStatus(pedido.status)].toLowerCase()}`}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={styles.dataCol}>
                            {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
                          </td>
                          <td>
                            <button
                              onClick={() => handleVerDetalhes(pedido)}
                              className={styles.detalhesBtn}
                            >
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className={styles.paginationSection}>
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => loadPedidos(pagination.page - 1, filtroStatus, searchTerm)}
                    className={styles.paginationBtn}
                  >
                    Anterior
                  </button>
                  <span className={styles.paginationInfo}>
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.pages}
                    onClick={() => loadPedidos(pagination.page + 1, filtroStatus, searchTerm)}
                    className={styles.paginationBtn}
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedPedido && (
        <div className={styles.modalOverlay} onClick={handleFecharModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Detalhes do Pedido #{selectedPedido.numero_pedido}</h2>
              <button className={styles.closeBtn} onClick={handleFecharModal}>
                <FiX size={24} />
              </button>
            </div>

            {loadingDetalhe ? (
              <div className={styles.modalLoading}>Carregando...</div>
            ) : pedidoDetalhe ? (
              <div className={styles.modalBody}>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Cliente:</label>
                    <span>{pedidoDetalhe.nome_cliente || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Status:</label>
                    <span style={{ color: getStatusBadgeColor(pedidoDetalhe.status) }}>
                      {pedidoDetalhe.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Subtotal:</label>
                    <span>{pedidoDetalhe.subtotal || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Tipo de Frete:</label>
                    <span>{pedidoDetalhe.tipo_frete || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Frete:</label>
                    <span>{pedidoDetalhe.valor_frete || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Desconto:</label>
                    <span>{pedidoDetalhe.desconto || 'R$ 0.00'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Valor Total:</label>
                    <span className={styles.totalValue}>{pedidoDetalhe.total || 'N/A'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Data:</label>
                    <span>{new Date(pedidoDetalhe.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className={styles.section}>
                  <h3>Itens do Pedido</h3>
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Preço</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidoDetalhe.itens?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.nome_produto || 'Produto'}</td>
                          <td>{item.quantidade}</td>
                          <td>R$ {parseFloat(item.preco || 0).toFixed(2)}</td>
                          <td>R$ {(parseFloat(item.preco || 0) * item.quantidade).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pedidoDetalhe.endereco_entrega && (
                  <div className={styles.section}>
                    <h3>Endereço de Entrega</h3>
                    <div className={styles.address}>
                      <p>{pedidoDetalhe.endereco_entrega.nome_destinatario}</p>
                      <p>
                        {pedidoDetalhe.endereco_entrega.rua}, {pedidoDetalhe.endereco_entrega.numero}
                      </p>
                      {pedidoDetalhe.endereco_entrega.complemento && (
                        <p>{pedidoDetalhe.endereco_entrega.complemento}</p>
                      )}
                      <p>
                        {pedidoDetalhe.endereco_entrega.bairro}, {pedidoDetalhe.endereco_entrega.cidade} -{' '}
                        {pedidoDetalhe.endereco_entrega.estado}
                      </p>
                      <p>CEP: {pedidoDetalhe.endereco_entrega.cep}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.modalError}>Erro ao carregar detalhes</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;

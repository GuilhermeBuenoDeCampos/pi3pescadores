import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBarChart2, FiCheckCircle, FiClock, FiGrid, FiHome, FiLogOut, FiPackage, FiSearch, FiShoppingBag, FiTruck, FiUser, FiX } from 'react-icons/fi';
import {
  fetchTodosPedidos,
  fetchPedidoAdmin,
  getAuthUser,
  clearAuthSession,
  atualizarStatusPedido,
} from '../services/api';
import logo from '../assets/logo/logo.png';
import styles from './SalesManagement.module.css';

const SalesManagement = () => {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);

  const statuses = ['pendente', 'confirmado', 'preparando', 'enviado', 'concluido', 'cancelado'];

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
    loadPedidos(pagination.page, filtroStatus, searchTerm);
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
      await atualizarStatusPedido(pedidoId, novoStatus);
      loadPedidos(pagination.page, filtroStatus, searchTerm);
      if (selectedPedido?.id === pedidoId) {
        loadPedidoDetalhe(pedidoId);
      }
    } catch (err) {
      setFeedbackModal({
        title: 'Erro ao atualizar status',
        message: err.message || 'Não foi possível atualizar o status do pedido.',
      });
    }
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
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="Tres Pescadores Store Logo" className={styles.logo} />
          <div>
            <strong>Tres Pescadores</strong>
            <span>Painel administrativo</span>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Menu de vendas">
          <span className={styles.navLabel}>Principal</span>
          <button className={styles.navItem} type="button" onClick={() => navigate('/estoque')}>
            <FiGrid /> Estoque
          </button>
          <button className={`${styles.navItem} ${styles.navItemActive}`} type="button">
            <FiBarChart2 /> Vendas
          </button>
          {getAuthUser()?.tipo_usuario === 'admin' && (
            <button className={styles.navItem} type="button" onClick={() => navigate('/admin')}>
              <FiHome /> Painel administrativo
            </button>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <FiUser />
            <div>
              <strong>{getAuthUser()?.nome || 'Usuário'}</strong>
              <span>Equipe de vendas</span>
            </div>
          </div>
          <button className={styles.logoutButton} type="button" onClick={() => { clearAuthSession(); navigate('/login'); }}>
            <FiLogOut /> Sair
          </button>
        </div>
      </aside>

      <div className={styles.mainArea}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.titleContainer}>
            <p className={styles.breadcrumb}>Painel / Vendas</p>
            <h1>Gerenciamento de vendas</h1>
            <div className={styles.subtitle}>Acompanhe pedidos, clientes e andamento das entregas.</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
              <FiUser size={14} />
              {getAuthUser()?.nome || 'Usuário'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => navigate('/admin')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#5366aa', background: '#f0f2f8', border: 'none', cursor: 'pointer',
                }}
              >
                <FiArrowLeft size={14} />
                Voltar
              </button>
              <button
                onClick={() => { clearAuthSession(); navigate('/login'); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  color: '#b91c1c', background: '#fef2f2', border: 'none', cursor: 'pointer',
                }}
              >
                <FiLogOut size={14} />
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className={styles.content}>
          <section className={styles.dashboardCards} aria-label="Indicadores de vendas">
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconBlue}`}><FiShoppingBag /></div>
              <div><h3>Pedidos na página</h3><strong>{pedidos.length}</strong><span>Resultados carregados</span></div>
            </article>
            <article className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.iconYellow}`}><FiClock /></div>
              <div><h3>Pendentes</h3><strong>{pendingOrders}</strong><span>Aguardando confirmação</span></div>
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
              <div><h3>Concluídos</h3><strong>{completedOrders}</strong><span>Pedidos finalizados</span></div>
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
            <span className={styles.filtersLabel}>Filtrar por status:</span>
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
                {status.charAt(0).toUpperCase() + status.slice(1)}
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
                          <td>{pedido.nome_cliente || 'Não informado'}</td>
                          <td>{pedido.itens?.length || 0}</td>
                          <td>R$ {parseFloat(pedido.valor_total || 0).toFixed(2)}</td>
                          <td>
                            <select
                              value={pedido.status}
                              onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                              className={styles.statusSelect}
                              style={{ borderColor: getStatusBadgeColor(pedido.status) }}
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                              ))}
                            </select>
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
                    <span>{pedidoDetalhe.nome_cliente || 'Não informado'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Status:</label>
                    <span style={{ color: getStatusBadgeColor(pedidoDetalhe.status) }}>
                      {pedidoDetalhe.status.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Subtotal:</label>
                    <span>{pedidoDetalhe.subtotal || 'Não informado'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Tipo de Frete:</label>
                    <span>{pedidoDetalhe.tipo_frete || 'Não informado'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Frete:</label>
                    <span>{pedidoDetalhe.valor_frete || 'Não informado'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Desconto:</label>
                    <span>{pedidoDetalhe.desconto || 'R$ 0.00'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Valor Total:</label>
                    <span className={styles.totalValue}>{pedidoDetalhe.total || 'Não informado'}</span>
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

      {feedbackModal && (
        <div className={styles.modalOverlay} onClick={() => setFeedbackModal(null)}>
          <section
            className={styles.feedbackModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
          >
            <div className={styles.feedbackModalHeader}>
              <h2 id="feedback-modal-title">{feedbackModal.title}</h2>
            </div>
            <p>{feedbackModal.message}</p>
            <div className={styles.feedbackModalActions}>
              <button type="button" className={styles.feedbackButton} onClick={() => setFeedbackModal(null)}>
                OK
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SalesManagement;

import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OrderStatusBadge, { STATUS_LABELS } from '../components/OrderStatusBadge';
import { fetchMeusPedidos, getAuthToken, getAuthUser, getImageUrl } from '../services/api';
import { formatPrice } from '../utils/productUtils';
import semImagem from '../assets/ProdutoSemImagem/semimagem.png';
import styles from './AccountPage.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getFirstImage(order) {
  const firstItem = order.itens?.find((item) => item.produto?.imagens?.[0]?.url);
  return firstItem ? getImageUrl(firstItem.produto.imagens[0].url) : semImagem;
}

function OrdersPage() {
  const user = getAuthUser();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError('');
        const result = await fetchMeusPedidos({
          page: pagination.page,
          limit: 8,
          status,
          search,
        });

        if (!active) return;
        setOrders(result.data || []);
        setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Nao foi possivel carregar seus pedidos.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [pagination.page, status, search]);

  const totalLabel = useMemo(() => {
    if (pagination.total === 1) return '1 pedido encontrado';
    return `${pagination.total || 0} pedidos encontrados`;
  }, [pagination.total]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setPagination((current) => ({ ...current, page: 1 }));
    setSearch(searchInput.trim());
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPagination((current) => ({ ...current, page: 1 }));
  }

  if (!getAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <Header />
      <main className={styles.page}>
        <section className={styles.headerPanel}>
          <div>
            <span className={styles.label}>{user?.nome || 'Minha conta'}</span>
            <h1>Meus pedidos</h1>
            <p>Acompanhe o histórico completo das suas compras e o andamento de cada pedido.</p>
          </div>
          <Link to="/" className={styles.backLink}>Voltar para a pagina inicial</Link>
        </section>

        <section className={styles.filters}>
          <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por número do pedido"
            />
            <button type="submit">Buscar</button>
          </form>
          <select value={status} onChange={handleStatusChange}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        <div className={styles.resultMeta}>{totalLabel}</div>

        {loading ? (
          <section className={styles.statePanel}>Carregando pedidos...</section>
        ) : error ? (
          <section className={styles.errorPanel}>{error}</section>
        ) : orders.length === 0 ? (
          <section className={styles.statePanel}>
            <h2>Nenhum pedido encontrado</h2>
            <p>Quando você finalizar uma compra, ela aparecerá aqui com todos os detalhes.</p>
            <Link to="/" className={styles.backLink}>Ver produtos</Link>
          </section>
        ) : (
          <section className={styles.ordersList}>
            {orders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.orderImage}>
                  <img
                    src={getFirstImage(order)}
                    alt={order.numero_pedido}
                    onError={(event) => {
                      event.currentTarget.src = semImagem;
                    }}
                  />
                </div>
                <div className={styles.orderContent}>
                  <div className={styles.orderTop}>
                    <div>
                      <span className={styles.orderNumber}>{order.numero_pedido}</span>
                      <time>{formatDate(order.criado_em)}</time>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className={styles.itemsPreview}>
                    {order.itens.slice(0, 3).map((item) => (
                      <span key={item.id}>
                        {item.quantidade}x {item.nome_produto}
                      </span>
                    ))}
                    {order.itens.length > 3 && <span>+{order.itens.length - 3} item(ns)</span>}
                  </div>
                  <div className={styles.orderFooter}>
                    <strong>R$ {formatPrice(order.total)}</strong>
                    <Link to={`/meus-pedidos/${order.id}`}>Ver detalhes</Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {!loading && pagination.pages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
            >
              Anterior
            </button>
            <span>Página {pagination.page} de {pagination.pages}</span>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
            >
              Próxima
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function AddressesPlaceholder() {
  const user = getAuthUser();

  return (
    <div>
      <Header />
      <main className={styles.page}>
        <section className={styles.statePanel}>
          <span className={styles.label}>{user?.nome || 'Minha conta'}</span>
          <h1>Meus endereços</h1>
          <p>Quando você cadastrar endereços, eles aparecerão aqui.</p>
          <Link to="/" className={styles.backLink}>Voltar para a loja</Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function AccountPage({ type }) {
  if (type === 'orders') {
    return <OrdersPage />;
  }

  return <AddressesPlaceholder />;
}

export default AccountPage;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FaEdit, FaMapMarkerAlt, FaPlus, FaSearch, FaStar, FaTimes, FaTrash } from 'react-icons/fa';
import Header from '../components/Header';
import Footer from '../components/Footer';
import OrderNumber from '../components/OrderNumber';
import OrderStatusBadge, { STATUS_LABELS } from '../components/OrderStatusBadge';
import {
  createAddress,
  deleteAddress,
  fetchMeusPedidos,
  fetchAddresses,
  getAuthToken,
  getAuthUser,
  getImageUrl,
  setPrimaryAddress,
  updateAddress,
} from '../services/api';
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

const EMPTY_FORM = {
  apelido: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
};

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCep(value) {
  const digits = digitsOnly(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function addressState(address) {
  return address.estado?.sigla || address.estado?.nome || address.cidade?.estado?.sigla || '';
}

function addressCity(address) {
  return address.cidade?.nome || '';
}

function buildAddressSummary(address) {
  const streetParts = [address.logradouro, address.numero].filter(Boolean);
  const neighborhood = address.bairro ? `Bairro ${address.bairro}` : '';
  const cityState = [addressCity(address), addressState(address)].filter(Boolean).join('/');

  return [streetParts.join(', '), neighborhood, cityState].filter(Boolean).join(' • ');
}

function toFormState(address) {
  return {
    apelido: address.apelido || '',
    cep: formatCep(address.cep || ''),
    logradouro: address.logradouro || '',
    numero: address.numero || '',
    complemento: address.complemento || '',
    bairro: address.bairro || '',
    cidade: addressCity(address),
    estado: addressState(address),
  };
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
        setError(err.message || 'Não foi possível carregar seus pedidos.');
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
      <main className={`${styles.page} ${styles.orderPage}`}>
        <section className={styles.headerPanel}>
          <div>
            <span className={styles.label}>{user?.nome || 'Minha conta'}</span>
            <h1>Meus pedidos</h1>
            <p>Acompanhe o histórico completo das suas compras e o andamento de cada pedido.</p>
          </div>
          <Link to="/" className={styles.backLink}>Voltar para a página inicial</Link>
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
                      <span className={styles.orderNumber}><OrderNumber numero={order.numero_pedido} /></span>
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

function AddressesPage() {
  const user = getAuthUser();
  const authToken = getAuthToken();
  const userId = user?.id || user?.sub || '';
  const modalRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [cepMessage, setCepMessage] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const redirectTarget = new URLSearchParams(location.search).get('redirect');

  const loadAddresses = useCallback(async ({ initial = false } = {}) => {
    if (!authToken || !userId) {
      setAddresses([]);
      setLoadingAddresses(false);
      return;
    }

    setLoadingAddresses(true);
    setError('');

    try {
      const data = await fetchAddresses();
      setAddresses(data);
    } catch (fetchError) {
      setError(fetchError.message || 'Não foi possível carregar os endereços.');

      if (initial) {
        setAddresses([]);
      }
    } finally {
      setLoadingAddresses(false);
    }
  }, [authToken, userId]);

  useEffect(() => {
    const handleSessionChange = () => setError('');

    window.addEventListener('auth-session-changed', handleSessionChange);

    return () => {
      window.removeEventListener('auth-session-changed', handleSessionChange);
    };
  }, []);

  useEffect(() => {
    if (!isFormOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeForm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFormOpen]);

  useEffect(() => {
    loadAddresses({ initial: true });
  }, [loadAddresses]);

  function openForm() {
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      modalRef.current?.focus();
    });
  }

  function startNewAddress() {
    setEditingAddressId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setCepMessage('');
    openForm();
  }

  function startEditingAddress(address) {
    setEditingAddressId(address.id);
    setForm(toFormState(address));
    setFormError('');
    setCepMessage('');
    openForm();
  }

  function closeForm() {
    setIsFormOpen(false);
    setFormError('');
    setCepMessage('');
  }

  async function refreshAddresses() {
    await loadAddresses();
  }

  async function handleCepLookup() {
    const cep = digitsOnly(form.cep);

    if (cep.length !== 8) {
      setCepMessage('Informe um CEP com 8 dígitos.');
      return;
    }

    setCepLoading(true);
    setCepMessage('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error('CEP não encontrado.');
      }

      setForm((current) => ({
        ...current,
        cep: formatCep(cep),
        logradouro: data.logradouro || current.logradouro,
        bairro: data.bairro || current.bairro,
        cidade: data.localidade || current.cidade,
        estado: data.uf || current.estado,
      }));

      setCepMessage('Endereço preenchido pelo ViaCEP.');
    } catch (lookupError) {
      setCepMessage(lookupError.message || 'Não foi possível consultar o CEP.');
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSavingAddress(true);
    setFormError('');

    const payload = {
      ...form,
      cep: digitsOnly(form.cep),
      cidade: String(form.cidade || '').trim(),
      estado: String(form.estado || '').trim(),
    };

    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, payload);
      } else {
        await createAddress(payload);
      }

      await refreshAddresses();
      closeForm();
      setEditingAddressId(null);
      setForm(EMPTY_FORM);

      if (redirectTarget === 'checkout') {
        navigate('/checkout/address', { replace: true });
      }
    } catch (submitError) {
      setFormError(submitError.message || 'Não foi possível salvar o endereço.');
    } finally {
      setSavingAddress(false);
    }
  }

  function requestDeleteAddress(address) {
    setDeleteConfirmation(address);
  }

  function closeDeleteConfirmation() {
    if (!deletingAddress) {
      setDeleteConfirmation(null);
    }
  }

  async function confirmDeleteAddress() {
    if (!deleteConfirmation) return;

    const address = deleteConfirmation;
    setDeletingAddress(address.id);

    setError('');

    try {
      await deleteAddress(address.id);
      await refreshAddresses();

      if (editingAddressId === address.id) {
        startNewAddress();
      }
    } catch (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir o endereço.');
    } finally {
      setDeletingAddress(null);
      setDeleteConfirmation(null);
    }
  }

  async function handleSetPrincipal(address) {
    setError('');

    try {
      await setPrimaryAddress(address.id);
      await refreshAddresses();
    } catch (principalError) {
      setError(principalError.message || 'Não foi possível definir o endereço principal.');
    }
  }

  const checkoutRedirect = redirectTarget === 'checkout';
  const isInitialAddressLoad = loadingAddresses && addresses.length === 0;
  const isRefreshingAddresses = loadingAddresses && addresses.length > 0;

  return (
    <div>
      <Header />
      <main className={`${styles.page} ${styles.addressPage}`}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.addressHeroTitle}>Meus endereços</h1>
            <p>Cadastre e gerencie seus locais de entrega.</p>
          </div>

          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryButton} onClick={startNewAddress}>
              <FaPlus size={14} />
              Novo endereço
            </button>
            <Link to={checkoutRedirect ? '/checkout/address' : '/'} className={styles.secondaryButton}>
              {checkoutRedirect ? 'Voltar ao checkout' : 'Voltar para a loja'}
            </Link>
          </div>
        </section>

        {error && <div className={styles.alert}>{error}</div>}

        <section className={styles.listSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>Endereços salvos</span>
              <h2 className={styles.addressSectionTitle}>Seus locais de entrega</h2>
            </div>
            {isRefreshingAddresses && <span className={styles.inlineLoading}>Atualizando...</span>}
          </div>

          {isInitialAddressLoad ? (
            <div className={styles.emptyState}>
              <strong>Carregando endereços...</strong>
              <span>Aguarde enquanto buscamos seus registros.</span>
            </div>
          ) : addresses.length === 0 ? (
            <div className={styles.emptyState}>
              <FaMapMarkerAlt size={28} />
              <strong>Você ainda não cadastrou nenhum endereço.</strong>
              <span>Cadastre um endereço para facilitar suas próximas compras.</span>
              <button type="button" className={styles.primaryButton} onClick={startNewAddress}>
                Cadastrar endereço
              </button>
            </div>
          ) : (
            <div className={styles.cardGrid}>
              {addresses.map((address) => (
                <article key={address.id} className={`${styles.addressCard} ${address.principal ? styles.primaryCard : ''}`}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardTitleRow}>
                        <FaMapMarkerAlt size={14} />
                        <span className={styles.cardTitle}>{address.apelido}</span>
                      </div>
                      <p className={styles.addressSummary}>{buildAddressSummary(address)}</p>
                      <p className={styles.cepLine}>CEP {formatCep(address.cep)}</p>
                    </div>
                    {address.principal && <span className={styles.principalBadge}>Principal</span>}
                  </div>

                  <div className={styles.cardActions}>
                    <button type="button" className={styles.cardButton} onClick={() => startEditingAddress(address)}>
                      <FaEdit size={13} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.cardButtonDanger}
                      disabled={deletingAddress === address.id}
                      onClick={() => requestDeleteAddress(address)}
                    >
                      <FaTrash size={13} />
                      {deletingAddress === address.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                    <button
                      type="button"
                      className={styles.cardButton}
                      disabled={address.principal}
                      onClick={() => handleSetPrincipal(address)}
                    >
                      <FaStar size={13} />
                      Definir como principal
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {isFormOpen && (
        <div className={styles.modalOverlay} onMouseDown={closeForm} role="presentation">
          <aside className={styles.modalCard} onMouseDown={(event) => event.stopPropagation()} ref={modalRef} tabIndex={-1}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.sectionKicker}>Endereço de entrega</span>
                <h2>{editingAddressId ? 'Editar endereço' : 'Adicionar endereço'}</h2>
              </div>
              <button type="button" className={styles.modalClose} onClick={closeForm} aria-label="Fechar formulário">
                <FaTimes size={14} />
              </button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="apelido">Apelido</label>
                <input
                  id="apelido"
                  className={styles.fieldInput}
                  value={form.apelido}
                  onChange={(event) => setForm((current) => ({ ...current, apelido: event.target.value }))}
                  placeholder="Casa, trabalho, entrega..."
                  required
                />
              </div>

              <div className={styles.cepRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="cep">CEP</label>
                  <input
                    id="cep"
                    className={styles.fieldInput}
                    value={form.cep}
                    onChange={(event) => setForm((current) => ({ ...current, cep: formatCep(event.target.value) }))}
                    onBlur={handleCepLookup}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                  />
                </div>

                <button type="button" className={styles.cepButton} onClick={handleCepLookup} disabled={cepLoading}>
                  <FaSearch size={13} />
                  {cepLoading ? 'Buscando...' : 'Buscar CEP'}
                </button>
              </div>

              {cepMessage && <p className={styles.helperText}>{cepMessage}</p>}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="logradouro">Logradouro</label>
                <input
                  id="logradouro"
                  className={styles.fieldInput}
                  value={form.logradouro}
                  onChange={(event) => setForm((current) => ({ ...current, logradouro: event.target.value }))}
                  placeholder="Rua, avenida, travessa..."
                  required
                />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="numero">Número</label>
                  <input
                    id="numero"
                    className={styles.fieldInput}
                    value={form.numero}
                    onChange={(event) => setForm((current) => ({ ...current, numero: event.target.value }))}
                    placeholder="123"
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="complemento">Complemento</label>
                  <input
                    id="complemento"
                    className={styles.fieldInput}
                    value={form.complemento}
                    onChange={(event) => setForm((current) => ({ ...current, complemento: event.target.value }))}
                    placeholder="Apto, bloco, fundos..."
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="bairro">Bairro</label>
                  <input
                    id="bairro"
                    className={styles.fieldInput}
                    value={form.bairro}
                    onChange={(event) => setForm((current) => ({ ...current, bairro: event.target.value }))}
                    placeholder="Seu bairro"
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="cidade">Cidade</label>
                  <input
                    id="cidade"
                    className={styles.fieldInput}
                    value={form.cidade}
                    onChange={(event) => setForm((current) => ({ ...current, cidade: event.target.value }))}
                    placeholder="Sua cidade"
                    required
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="estado">Estado</label>
                <input
                  id="estado"
                  className={styles.fieldInput}
                  value={form.estado}
                  onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value }))}
                  placeholder="SP"
                  required
                />
              </div>

              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formActions}>
                <button type="button" className={styles.ghostButton} onClick={closeForm}>
                  Cancelar
                </button>
                <button type="submit" className={styles.primaryButton} disabled={savingAddress}>
                  {savingAddress ? 'Salvando...' : 'Salvar endereço'}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {deleteConfirmation && (
        <div className={styles.modalOverlay} onMouseDown={closeDeleteConfirmation} role="presentation">
          <section
            className={styles.confirmModal}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-address-title"
          >
            <div className={styles.confirmModalHeader}>
              <span className={styles.sectionKicker}>Confirmar exclusão</span>
              <h2 id="delete-address-title">Excluir endereço?</h2>
            </div>
            <p>
              O endereço "{deleteConfirmation.apelido || 'Endereço cadastrado'}" será removido da sua conta.
            </p>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={closeDeleteConfirmation}
                disabled={Boolean(deletingAddress)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={confirmDeleteAddress}
                disabled={Boolean(deletingAddress)}
              >
                {deletingAddress ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </section>
        </div>
      )}
      <Footer />
    </div>
  );
}

function AccountPage({ type }) {
  if (type === 'orders') {
    return <OrdersPage />;
  }

  return <AddressesPage />;
}

export default AccountPage;

import { BACKEND_URL, API_URL } from '../config/appConfig';

export { BACKEND_URL, API_URL };

/**
 * API Configuration & Utilities
 * Handles backend API requests and exposes the shared backend URL configuration.
 */

const GUEST_TOKEN_KEY = 'guest_token';

function notifyAuthSessionChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-session-changed'));
  }
}

export function getGuestToken() {
  return localStorage.getItem(GUEST_TOKEN_KEY);
}

export function ensureGuestToken() {
  const existing = getGuestToken();

  if (existing) {
    return existing;
  }

  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  localStorage.setItem(GUEST_TOKEN_KEY, token);
  return token;
}

export function rotateGuestToken() {
  localStorage.removeItem(GUEST_TOKEN_KEY);
  return ensureGuestToken();
}

function buildCartHeaders(extraHeaders = {}) {
  const headers = {
    ...extraHeaders,
  };

  const authToken = getAuthToken();
  const guestToken = ensureGuestToken();

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  if (guestToken) {
    headers['x-guest-token'] = guestToken;
  }

  return headers;
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    clearAuthSession();

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }

  return response;
}

async function parseApiError(response, fallbackMessage) {
  try {
    const body = await response.clone().json();

    if (typeof body?.error === 'string') {
      return body.error;
    }

    return body?.error?.message || body?.message || fallbackMessage;
  } catch {
    try {
      const text = await response.text();
      return text || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
}

function clearExpiredAuthSession(response) {
  if (response.status === 401 && getAuthToken()) {
    clearAuthSession();
  }
}

export async function registerUser(payload) {
  const response = await apiFetch(`${API_URL}/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível criar a conta.'));
  }

  const result = await response.json();
  return result.data;
}

export async function loginUser(payload) {
  const guestToken = ensureGuestToken();

  const response = await apiFetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      guest_token: guestToken,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'E-mail ou senha inválidos.'));
  }

  const result = await response.json();
  return result.data;
}

export function getAuthToken() {
  return localStorage.getItem('authToken');
}

export function getAuthUser() {
  const rawUser = localStorage.getItem('authUser');

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

export function saveAuthSession(session) {
  localStorage.setItem('authToken', session.token);
  localStorage.setItem('authUser', JSON.stringify(session.usuario));
  notifyAuthSessionChanged();
}

export function clearAuthSession(options = {}) {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('authUser');

  if (options.rotateGuestToken) {
    rotateGuestToken();
  }

  notifyAuthSessionChanged();
}

export function getImageUrl(url) {
  const normalizedUrl = String(url || '').trim();

  if (!normalizedUrl) return '';
  if (/^(https?:)?\/\//i.test(normalizedUrl) || normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('blob:')) {
    return normalizedUrl;
  }

  return `${BACKEND_URL}/${normalizedUrl.replace(/^\/+/, '')}`;
}

export async function fetchProducts(filters = {}) {
  const params = new URLSearchParams();

  if (filters.category) {
    params.append('id_categoria', filters.category);
  }

  if (filters.active !== undefined) {
    params.append('ativo', filters.active);
  }

  const queryString = params.toString();
  const url = queryString ? `${API_URL}/produtos?${queryString}` : `${API_URL}/produtos`;

  const response = await apiFetch(url);

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Não foi possível carregar os produtos: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data || [];
}

export async function fetchProductById(id) {
  const response = await apiFetch(`${API_URL}/produtos/${id}`);

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Não foi possível carregar o produto: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchProductByName(nome) {
  const response = await apiFetch(`${API_URL}/produtos/nome/${encodeURIComponent(nome)}`);

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Produto não encontrado: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchProdutosAleatorios() {
  const response = await apiFetch(`${API_URL}/auditoria/aleatorios`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar os produtos aleatórios: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

export async function salvarAuditoria(auditorias) {
  const response = await apiFetch(`${API_URL}/auditoria/salvar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ auditorias }),
  });

  if (!response.ok) {
    throw new Error(`Não foi possível salvar a auditoria: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

export async function fetchHistoricoAuditoria(page = 1, limit = 10) {
  const response = await apiFetch(`${API_URL}/auditoria/historico?page=${page}&limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível carregar o histórico de auditorias: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

export async function fetchMediaAcuracidade() {
  const response = await apiFetch(`${API_URL}/auditoria/acuracidade-media`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Não foi possível carregar a média de acuracidade: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

export async function registrarPalavraPesquisada(palavra) {
  const response = await apiFetch(`${API_URL}/pesquisas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ palavra }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível registrar a pesquisa.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchPalavrasMaisPesquisadas(limit = 5) {
  const response = await apiFetch(`${API_URL}/pesquisas/mais-pesquisadas?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível carregar as palavras mais pesquisadas.'));
  }

  const result = await response.json();
  return result.data || [];
}

export async function fetchCategories() {
  const response = await apiFetch(`${API_URL}/categorias`);

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Não foi possível carregar as categorias: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data || [];
}

export async function updateProductStatus(id, ativo) {
  const response = await apiFetch(`${API_URL}/produtos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ ativo }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Não foi possível atualizar o status do produto: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchCart() {
  const response = await apiFetch(`${API_URL}/cart`, {
    headers: buildCartHeaders(),
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível carregar o carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function addCartItem(payload) {
  const response = await apiFetch(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: buildCartHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível adicionar o item ao carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function updateCartItem(itemId, payload) {
  const response = await apiFetch(`${API_URL}/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: buildCartHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível atualizar o item do carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function removeCartItem(itemId) {
  const response = await apiFetch(`${API_URL}/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: buildCartHeaders(),
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível remover o item do carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function calculateShipping(payload) {
  const response = await apiFetch(`${API_URL}/frete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Erro ao calcular o frete.'));
  }

  return response.json();
}

export async function fetchAddresses() {
  const response = await apiFetch(`${API_URL}/enderecos`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível carregar os endereços.'));
  }

  const result = await response.json();
  return result.data || [];
}

export async function getUserAddresses() {
  return fetchAddresses();
}

export async function createAddress(payload) {
  const response = await apiFetch(`${API_URL}/enderecos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível criar o endereço.'));
  }

  const result = await response.json();
  return result.data;
}

export async function updateAddress(id, payload) {
  const response = await apiFetch(`${API_URL}/enderecos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível atualizar o endereço.'));
  }

  const result = await response.json();
  return result.data;
}

export async function deleteAddress(id) {
  const response = await apiFetch(`${API_URL}/enderecos/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível excluir o endereço.'));
  }

  const result = await response.json();
  return result.data;
}

export async function setPrimaryAddress(id) {
  const response = await apiFetch(`${API_URL}/enderecos/${id}/principal`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível definir o endereço principal.'));
  }

  const result = await response.json();
  return result.data;
}

/**
 * Usuários CRUD (Admin)
 */

export async function fetchUsuarios() {
  const response = await apiFetch(`${API_URL}/usuarios`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Falha ao carregar usuários'));
  }

  const result = await response.json();
  return result.data || [];
}

export async function fetchUsuarioById(id) {
  const response = await apiFetch(`${API_URL}/usuarios/${id}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Usuário não encontrado'));
  }

  const result = await response.json();
  return result.data;
}

export async function criarUsuario(payload) {
  const response = await apiFetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Falha ao criar usuário'));
  }

  const result = await response.json();
  return result.data;
}

export async function atualizarUsuario(id, payload) {
  const response = await apiFetch(`${API_URL}/usuarios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Falha ao atualizar usuário'));
  }

  const result = await response.json();
  return result.data;
}

export async function excluirUsuario(id) {
  const response = await apiFetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Falha ao excluir usuário'));
  }
}

/**
 * Pedidos
 */

export async function criarPedido(payload) {
  const response = await apiFetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível criar o pedido.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchMeusPedidos(params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString();

  const response = await apiFetch(`${API_URL}/pedidos/meus${queryString ? `?${queryString}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível carregar seus pedidos.'));
  }

  return response.json();
}

export async function fetchMeuPedido(id) {
  const response = await apiFetch(`${API_URL}/pedidos/meus/${id}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Pedido não encontrado.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchMinhaAvaliacaoPedido(pedidoId) {
  const response = await apiFetch(`${API_URL}/avaliacoes/meus/${pedidoId}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    clearExpiredAuthSession(response);
    throw new Error(await parseApiError(response, 'Não foi possível verificar a avaliação do pedido.'));
  }

  const result = await response.json();
  return result.data;
}

export async function criarAvaliacao(payload) {
  const response = await apiFetch(`${API_URL}/avaliacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível enviar a avaliação.'));
  }

  const result = await response.json();
  return result.data;
}

export async function atualizarStatusPedido(id, status) {
  const response = await apiFetch(`${API_URL}/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível atualizar o pedido.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchTodosPedidos(params = {}) {
  const query = new URLSearchParams();

  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString();

  const response = await apiFetch(`${API_URL}/pedidos${queryString ? `?${queryString}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível carregar os pedidos.'));
  }

  return response.json();
}

export async function fetchTaxaRecompraAnual(ano) {
  const query = ano ? `?ano=${encodeURIComponent(ano)}` : '';

  const response = await apiFetch(`${API_URL}/pedidos/admin/taxa-recompra-anual${query}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível carregar a taxa de recompra.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchPedidoAdmin(id) {
  const response = await apiFetch(`${API_URL}/pedidos/${id}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Pedido não encontrado.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchKpiSatisfacao() {
  const response = await apiFetch(`${API_URL}/admin/kpis/satisfacao`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Não foi possível carregar os KPIs de satisfação.'));
  }

  const result = await response.json();
  return result.data;
}

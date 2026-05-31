import axios from 'axios';
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
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function parseApiError(response, fallbackMessage) {
  try {
    const body = await response.json();
    return body?.error?.message || body?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function registerUser(payload) {
  const response = await fetch(`${API_URL}/auth/cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel criar a conta.'));
  }

  const result = await response.json();
  return result.data;
}

export async function loginUser(payload) {
  const guestToken = ensureGuestToken();
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      guest_token: guestToken,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Email ou senha invalidos.'));
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

  if (options.rotateGuestToken) {
    rotateGuestToken();
  }

  notifyAuthSessionChanged();
}

/**
 * Constrói URL completa para imagens
 * Lida com três casos:
 * 1. URL vazia/null → retorna vazio
 * 2. URL completa (http/https) → retorna como está
 * 3. Caminho relativo → prepende BACKEND_URL
 * 
 * Exemplo:
 * getImageUrl('/uploads/Banner/imagem.jpg') 
 * → 'https://pi3pescadores.onrender.com/uploads/Banner/imagem.jpg'
 * 
 * @param {string} url - URL ou caminho da imagem
 * @returns {string} URL completa da imagem
 */
export function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}


/**
 * Busca produtos com filtros opcionais
 * 
 * @param {Object} filters - Filtros (category, active, etc)
 * @returns {Promise<Array>} Lista de produtos
 * @throws {Error} Se falhar requisição
 */
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

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to fetch products: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data || [];
}


/**
 * Busca um produto específico por ID
 * 
 * @param {string|number} id - ID do produto
 * @returns {Promise<Object>} Dados do produto
 * @throws {Error} Se falhar requisição
 */
export async function fetchProductById(id) {
  const response = await fetch(`${API_URL}/produtos/${id}`);
  
  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to fetch product: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

/**
 * Busca um produto específico pelo nome (slug)
 * 
 * @param {string} nome - Nome/slug do produto
 * @returns {Promise<Object>} Dados do produto
 * @throws {Error} Se falhar requisição ou produto não encontrado
 */
export async function fetchProductByName(nome) {
  const response = await fetch(`${API_URL}/produtos/nome/${encodeURIComponent(nome)}`);
  
  if (!response.ok) {
    throw new Error(await parseApiError(response, `Produto não encontrado: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

/**
 * Busca 5 produtos aleatórios para auditoria
 * 
 * @returns {Promise<Array>} Lista de 5 produtos aleatórios
 * @throws {Error} Se falhar requisição
 */
export async function fetchProdutosAleatorios() {
  const response = await fetch(`${API_URL}/auditoria/aleatorios`, {
    headers: { ...getAuthHeaders() },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch random products: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Salva registros de auditoria de estoque
 * 
 * @param {Array} auditorias - Array com dados de auditoria
 * @returns {Promise<Object>} Resultado da operação
 * @throws {Error} Se falhar requisição
 */
export async function salvarAuditoria(auditorias) {
  const response = await fetch(`${API_URL}/auditoria/salvar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ auditorias })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to save audit: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Busca histórico de auditorias
 * 
 * @param {number} page - Número da página
 * @param {number} limit - Quantidade por página
 * @returns {Promise<Object>} Histórico com paginação
 * @throws {Error} Se falhar requisição
 */
export async function fetchHistoricoAuditoria(page = 1, limit = 10) {
  const response = await fetch(`${API_URL}/auditoria/historico?page=${page}&limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch audit history: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

export async function fetchMediaAcuracidade() {
  const response = await fetch(`${API_URL}/auditoria/acuracidade-media`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to fetch accuracy average: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

export async function registrarPalavraPesquisada(palavra) {
  const response = await fetch(`${API_URL}/pesquisas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ palavra }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel registrar a pesquisa.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchPalavrasMaisPesquisadas(limit = 5) {
  const response = await fetch(`${API_URL}/pesquisas/mais-pesquisadas?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel carregar as palavras mais pesquisadas.'));
  }

  const result = await response.json();
  return result.data || [];
}

export async function fetchFinanceDashboard(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/dashboard/financeiro${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
}

export async function fetchFaturamentoMensal(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/dashboard/faturamento-mensal${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
}

export async function fetchProdutosMaisVendidos(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/dashboard/produtos-mais-vendidos${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
}

export async function fetchCategorias(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/dashboard/categorias${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
}

export async function fetchVendasPorPeriodo(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await axios.get(`${API_URL}/dashboard/vendas-por-periodo${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });

  return response.data.data;
}

/**
 * Busca todas as categorias de produtos
 * 
 * @returns {Promise<Array>} Lista de categorias
 * @throws {Error} Se falhar requisição
 */
export async function fetchCategories() {
  const response = await fetch(`${API_URL}/categorias`);
  
  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to fetch categories: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Atualiza o status ativo de um produto
 * 
 * @param {string|number} id - ID do produto
 * @param {boolean} ativo - Novo valor para ativo
 * @returns {Promise<Object>} Dados do produto atualizado
 * @throws {Error} Se falhar requisição
 */
export async function updateProductStatus(id, ativo) {
  const response = await fetch(`${API_URL}/produtos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ ativo })
  });
  
  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to update product status: ${response.statusText}`));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchCart() {
  const response = await fetch(`${API_URL}/cart`, {
    headers: buildCartHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel carregar o carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function addCartItem(payload) {
  const response = await fetch(`${API_URL}/cart/items`, {
    method: 'POST',
    headers: buildCartHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel adicionar o item ao carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function updateCartItem(itemId, payload) {
  const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: buildCartHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel atualizar o item do carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function removeCartItem(itemId) {
  const response = await fetch(`${API_URL}/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: buildCartHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel remover o item do carrinho.'));
  }

  const result = await response.json();
  return result.data;
}

export async function calculateShipping(payload) {
    const response = await fetch(`${API_URL}/frete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(await parseApiError(response, 'Erro ao calcular o frete.'));
    }

    return response.json();
}

/**
 * Usuários CRUD (Admin)
 */

export async function fetchUsuarios() {
  const response = await fetch(`${API_URL}/usuarios`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Falha ao carregar usuários'));
  }

  const result = await response.json();
  return result.data || [];
}

export async function fetchUsuarioById(id) {
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Usuário não encontrado'));
  }

  const result = await response.json();
  return result.data;
}

export async function criarUsuario(payload) {
  const response = await fetch(`${API_URL}/usuarios`, {
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
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
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
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
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
  const response = await fetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel criar o pedido.'));
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
  const response = await fetch(`${API_URL}/pedidos/meus${queryString ? `?${queryString}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel carregar seus pedidos.'));
  }

  return response.json();
}

export async function fetchMeuPedido(id) {
  const response = await fetch(`${API_URL}/pedidos/meus/${id}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Pedido nao encontrado.'));
  }

  const result = await response.json();
  return result.data;
}

export async function atualizarStatusPedido(id, status) {
  const response = await fetch(`${API_URL}/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel atualizar o pedido.'));
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
  const response = await fetch(`${API_URL}/pedidos${queryString ? `?${queryString}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel carregar os pedidos.'));
  }

  return response.json();
}

export async function fetchTaxaRecompraAnual(ano) {
  const query = ano ? `?ano=${encodeURIComponent(ano)}` : '';
  const response = await fetch(`${API_URL}/pedidos/admin/taxa-recompra-anual${query}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Nao foi possivel carregar a taxa de recompra.'));
  }

  const result = await response.json();
  return result.data;
}

export async function fetchPedidoAdmin(id) {
  const response = await fetch(`${API_URL}/pedidos/${id}`, {
    headers: { ...getAuthHeaders() },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, 'Pedido não encontrado.'));
  }

  const result = await response.json();
  return result.data;
}

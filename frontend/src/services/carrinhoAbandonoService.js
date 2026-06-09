import { API_URL, apiFetch, clearAuthSession, getAuthHeaders } from './api';

function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return query.toString();
}

async function parseDashboardError(response, fallbackMessage) {
  if (response.status === 401) {
    clearAuthSession();
    return new Error('Sua sessao expirou. Entre novamente como administrador.');
  }

  if (response.status === 403) {
    return new Error('Acesso restrito. Use uma conta de administrador.');
  }

  try {
    const body = await response.json();
    return new Error(body?.message || body?.error?.message || body?.error || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
}

export async function fetchCarrinhoAbandonoDashboard(filters = {}) {
  const query = buildQuery(filters);
  const response = await apiFetch(`${API_URL}/dashboard/carrinho${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw await parseDashboardError(response, 'Nao foi possivel carregar o abandono de carrinho.');
  }

  return response.json();
}

export async function fetchCarrinhoAbandonoMensal(year = new Date().getFullYear()) {
  const response = await apiFetch(`${API_URL}/dashboard/carrinho/mensal?year=${year}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw await parseDashboardError(response, 'Nao foi possivel carregar o relatorio mensal.');
  }

  return response.json();
}

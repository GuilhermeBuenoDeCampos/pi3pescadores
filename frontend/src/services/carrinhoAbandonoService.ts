import axios from 'axios';
import { API_URL, clearAuthSession, getAuthHeaders } from './api';
import type {
  CarrinhoAbandonoDashboard,
  CarrinhoAbandonoFilters,
  CarrinhoAbandonoMensal,
} from '../types/carrinhoAbandono';

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  return query.toString();
}

function normalizeDashboardError(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    clearAuthSession();
    return new Error('Sua sessao expirou. Entre novamente como administrador.');
  }

  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return new Error('Acesso restrito. Use uma conta de administrador.');
  }

  return error;
}

export async function fetchCarrinhoAbandonoDashboard(
  filters: CarrinhoAbandonoFilters = {}
): Promise<CarrinhoAbandonoDashboard> {
  const query = buildQuery(filters);
  try {
    const response = await axios.get<CarrinhoAbandonoDashboard>(
      `${API_URL}/dashboard/carrinho${query ? `?${query}` : ''}`,
      { headers: getAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    throw normalizeDashboardError(error);
  }
}

export async function fetchCarrinhoAbandonoMensal(year = new Date().getFullYear()): Promise<CarrinhoAbandonoMensal[]> {
  try {
    const response = await axios.get<CarrinhoAbandonoMensal[]>(
      `${API_URL}/dashboard/carrinho/mensal?year=${year}`,
      { headers: getAuthHeaders() }
    );

    return response.data;
  } catch (error) {
    throw normalizeDashboardError(error);
  }
}

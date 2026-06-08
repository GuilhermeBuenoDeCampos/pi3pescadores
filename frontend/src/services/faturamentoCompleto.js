import { API_URL, getAuthHeaders } from './api';

async function fetchFaturamento(endpoint) {
  const response = await fetch(`${API_URL}/faturamento-completo/${endpoint}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) {
    throw new Error(`Erro ao carregar dados de faturamento: ${response.status}`);
  }
  const result = await response.json();
  return result.data;
}

export async function obterResumoFaturamento() {
  return fetchFaturamento('resumo');
}

export async function obterFaturamentoPorCategoria() {
  return fetchFaturamento('por-categoria');
}

export async function obterTopProdutos(limit = 10) {
  return fetchFaturamento(`top-produtos?limit=${limit}`);
}

export async function obterComparativoAnual() {
  return fetchFaturamento('comparativo-anual');
}

export async function obterMetaRealizado() {
  return fetchFaturamento('meta-realizado');
}

export async function obterFaturamentoPorMetodoPagamento() {
  return fetchFaturamento('por-metodo-pagamento');
}

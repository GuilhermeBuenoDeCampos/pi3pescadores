import { API_URL, apiFetch, getAuthHeaders } from './api';

export async function enviarEventosAnalytics(eventos) {
  try {
    await apiFetch(`${API_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ eventos }),
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] Erro ao enviar eventos:', err.message);
    }
  }
}

export async function obterTempoPorPagina(dias = 30) {
  const response = await apiFetch(`${API_URL}/analytics/page-time?dias=${dias}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar tempo por página');
  const result = await response.json();
  return result.data;
}

export async function obterHeatmap(pagina = null, dias = 30) {
  const params = new URLSearchParams({ dias });
  if (pagina) params.append('pagina', pagina);

  const response = await apiFetch(`${API_URL}/analytics/heatmap?${params}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar heatmap');
  const result = await response.json();
  return result.data;
}

export async function obterPaginasEngajamento(dias = 30) {
  const response = await apiFetch(`${API_URL}/analytics/paginas-engajamento?dias=${dias}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar páginas com engajamento');
  const result = await response.json();
  return result.data;
}

export async function obterUsuariosPorMes(dias = 90) {
  const response = await apiFetch(`${API_URL}/analytics/usuarios-por-mes?dias=${dias}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar usuários por mês');
  const result = await response.json();
  return result.data;
}

export async function obterEstatisticasComportamento(dias = 30) {
  const response = await apiFetch(`${API_URL}/analytics/estatisticas?dias=${dias}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar estatísticas de comportamento');
  const result = await response.json();
  return result.data;
}

export async function obterPaginasPorUsuario(usuarioId, dias = 90) {
  const response = await apiFetch(`${API_URL}/analytics/usuarios/${encodeURIComponent(usuarioId)}/paginas?dias=${dias}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar páginas do usuário');
  const result = await response.json();
  return result.data;
}

export async function obterHeatmapPorUsuarioPagina(usuarioId, pagina, dias = 90) {
  const params = new URLSearchParams({ pagina, dias });
  const response = await apiFetch(`${API_URL}/analytics/usuarios/${encodeURIComponent(usuarioId)}/heatmap?${params}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!response.ok) throw new Error('Erro ao carregar heatmap do usuário');
  const result = await response.json();
  return result.data;
}

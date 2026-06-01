import { API_URL, apiFetch, getAuthToken } from './api';

export const obterKpiConfig = async () => {
  try {
    // Usa apiFetch para aplicar o tratamento global de 401.
    const response = await apiFetch(`${API_URL}/kpi-config`);
    if (!response.ok) {
      throw new Error('Erro ao buscar configuração KPI');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao obter KPI config:', error);
    return null;
  }
};

export const atualizarKpiConfig = async (config) => {
  try {
    const authToken = getAuthToken();
    // Usa apiFetch para limpar sessão e redirecionar se o token expirar.
    const response = await apiFetch(`${API_URL}/kpi-config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        faturamento_baixo: parseFloat(config.faturamento_baixo),
        faturamento_alto: parseFloat(config.faturamento_alto),
        ticketbaixo: parseFloat(config.ticketbaixo),
        ticketalto: parseFloat(config.ticketalto),
        recomprabaixa: parseFloat(config.recomprabaixa),
        recompraalta: parseFloat(config.recompraalta),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Erro ao atualizar configuração');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao atualizar KPI config:', error);
    throw error;
  }
};

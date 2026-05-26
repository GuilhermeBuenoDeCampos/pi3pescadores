import { API_URL, getAuthToken } from './api';

export const obterKpiConfig = async () => {
  try {
    const response = await fetch(`${API_URL}/kpi-config`);
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

export const atualizarKpiConfig = async (faturamento_baixo, faturamento_alto) => {
  try {
    const authToken = getAuthToken();
    const response = await fetch(`${API_URL}/kpi-config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        faturamento_baixo: parseFloat(faturamento_baixo),
        faturamento_alto: parseFloat(faturamento_alto),
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

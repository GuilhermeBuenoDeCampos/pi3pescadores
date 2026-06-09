import { API_URL, getAuthToken } from './api';

export const obterMediaLeadtime = async () => {
  try {
    const response = await fetch(`${API_URL}/leadtime`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Erro ao buscar média de leadtime');
    }
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao obter média leadtime:', error);
    return null;
  }
};

export const obterLeadtimePorPeriodo = async (mes = 1) => {
  try {
    const authToken = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}/leadtime/periodo?mes=${mes}`, {
      cache: 'no-store',
      headers,
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar leadtime por período');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao obter leadtime por período:', error);
    return [];
  }
};

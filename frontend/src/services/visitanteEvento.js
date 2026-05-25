import { BACKEND_URL } from './api';
import { getAuthHeaders } from './api';

/**
 * Registra um evento de visitante
 * @param {string} evento - Tipo do evento (visitou_home, visualizou_produto, etc)
 */
export async function registrarEventoVisitante(evento) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders(), // Incluir token se disponível
    };

    const response = await fetch(`${BACKEND_URL}/api/visitante-evento`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ evento }),
    });

    if (!response.ok) {
      console.warn(`[visitante-evento] Erro ao registrar evento: ${evento}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[visitante-evento] Erro:', error);
    return null;
  }
}

/**
 * Obter estatísticas de eventos
 */
export async function obterEstatisticasEventos() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/visitante-evento/stats`);
    
    if (!response.ok) {
      throw new Error('Erro ao obter estatísticas');
    }

    return await response.json();
  } catch (error) {
    console.error('[visitante-evento] Erro ao obter stats:', error);
    return [];
  }
}

/**
 * Obter eventos recentes
 */
export async function obterEventosRecentes(dias = 7) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/visitante-evento/recentes?dias=${dias}`);
    
    if (!response.ok) {
      throw new Error('Erro ao obter eventos');
    }

    return await response.json();
  } catch (error) {
    console.error('[visitante-evento] Erro ao obter eventos:', error);
    return [];
  }
}

/**
 * Obter taxa de conversão (visitantes vs pedidos confirmados)
 */
export async function obterTaxaConversao() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/visitante-evento/taxa-conversao`);
    
    if (!response.ok) {
      throw new Error('Erro ao obter taxa de conversão');
    }

    return await response.json();
  } catch (error) {
    console.error('[visitante-evento] Erro ao obter taxa de conversão:', error);
    return [];
  }
}

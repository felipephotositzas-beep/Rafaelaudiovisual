import { Platform } from 'react-native';

const API_TRACK_URL = 'https://rafaelpublicado.com.br/api/analytics/track';
const API_SUMMARY_URL = 'https://rafaelpublicado.com.br/api/analytics/summary';

/**
 * Envia um evento de telemetria/métrica para o backend de forma assíncrona
 */
export const trackEvent = async (eventType, data = {}) => {
  try {
    if (Platform.OS !== 'web' && typeof window === 'undefined') return;

    fetch(API_TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        event_id: data.eventId || null,
        event_name: data.eventName || null,
        search_query: data.query || null,
        metadata: data.metadata || {},
      }),
    }).catch(() => {});
  } catch {}
};

/**
 * Registra visualização geral de página
 */
export const trackPageView = (pageName = 'home') => {
  trackEvent('page_view', { metadata: { page: pageName } });
};

/**
 * Registra acesso a um evento específico
 */
export const trackEventView = (eventId, eventName) => {
  if (!eventId) return;
  trackEvent('event_view', { eventId: String(eventId), eventName: eventName || 'Evento' });
};

/**
 * Registra quem buscou por termos/eventos
 */
export const trackSearch = (query) => {
  if (!query || !query.trim() || query.trim().length < 2) return;
  trackEvent('search', { query: query.trim() });
};

/**
 * Registra busca facial realizada em um evento
 */
export const trackFaceSearch = (eventId, eventName) => {
  trackEvent('face_search', { eventId: String(eventId), eventName: eventName || 'Evento' });
};

/**
 * Obtém resumo consolidado para o Painel Admin
 */
export const fetchAnalyticsSummary = async () => {
  try {
    const res = await fetch(API_SUMMARY_URL);
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar métricas:', err);
    return null;
  }
};


const API_LEADS_URL = 'https://rafaelpublicado.com.br/api/leads/whatsapp';

/**
 * Salva número de WhatsApp capturado no site
 */
export const submitWhatsAppLead = async (whatsapp, name = '') => {
  try {
    const res = await fetch(API_LEADS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp, name, source: 'home_newsletter' }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Erro ao enviar lead:', err);
    return false;
  }
};

/**
 * Busca lista de leads de WhatsApp para o Admin
 */
export const fetchWhatsAppLeads = async () => {
  try {
    const res = await fetch(API_LEADS_URL);
    if (res.ok) {
      const data = await res.json();
      return data.leads || [];
    }
    return [];
  } catch (err) {
    console.warn('Erro ao buscar leads:', err);
    return [];
  }
};

/**
 * Exclui lead de WhatsApp
 */
export const deleteWhatsAppLead = async (id) => {
  try {
    const res = await fetch(`${API_LEADS_URL}/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Erro ao excluir lead:', err);
    return false;
  }
};

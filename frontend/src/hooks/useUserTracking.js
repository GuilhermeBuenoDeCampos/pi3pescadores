import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { enviarEventosAnalytics } from '../services/analytics';

const SESSION_KEY = 'analytics_session_id';
const FLUSH_INTERVAL = 15000;

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getPageOrigin() {
  if (typeof document === 'undefined') return '';
  return document.referrer || document.location?.href || '';
}

const HOVER_DEBOUNCE_MS = 300;

export default function useUserTracking({ enabled = true } = {}) {
  const location = useLocation();
  const sessaoId = useRef(getSessionId());
  const buffer = useRef([]);
  const pageStartTime = useRef(Date.now());
  const pagePath = useRef(location.pathname);
  const hoverTimers = useRef(new Map());
  const hoverStart = useRef(new Map());

  const flush = useCallback(() => {
    if (buffer.current.length === 0) return;
    const batch = buffer.current.splice(0);
    enviarEventosAnalytics(batch);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(flush, FLUSH_INTERVAL);
    const flushOnUnload = () => {
      if (buffer.current.length > 0) {
        const payload = buffer.current.splice(0);
        navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL || ''}/analytics/track`,
          new Blob([JSON.stringify({ eventos: payload })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', flushOnUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', flushOnUnload);
      flush();
    };
  }, [enabled, flush]);

  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    const prevPath = pagePath.current;
    const elapsed = now - pageStartTime.current;

    if (prevPath && elapsed > 1000) {
      buffer.current.push({
        sessao_id: sessaoId.current,
        tipo: 'page_view',
        pagina: prevPath,
        duracao_ms: elapsed,
        origem: getPageOrigin(),
      });
    }

    pagePath.current = location.pathname;
    pageStartTime.current = now;
  }, [location.pathname, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e) => {
      const target = e.target;
      const elemento = target
        ? `${target.tagName.toLowerCase()}${target.id ? '#' + target.id : ''}${target.className && typeof target.className === 'string' ? '.' + target.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''}`
        : 'unknown';

      buffer.current.push({
        sessao_id: sessaoId.current,
        tipo: 'click',
        pagina: location.pathname,
        elemento: elemento.slice(0, 200),
        coordenada_x: e.clientX,
        coordenada_y: e.clientY,
        largura_tela: window.innerWidth,
        altura_tela: window.innerHeight,
      });
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target || target.tagName === 'BODY' || target.tagName === 'HTML') return;

      const key = target.tagName.toLowerCase() + (target.id ? '#' + target.id : '');
      if (!key || key === 'body' || key === 'html') return;

      if (!hoverStart.current.has(key)) {
        hoverStart.current.set(key, Date.now());
      }

      if (hoverTimers.current.has(key)) {
        clearTimeout(hoverTimers.current.get(key));
      }

      hoverTimers.current.set(key, setTimeout(() => {
        const start = hoverStart.current.get(key);
        if (start) {
          const duration = Date.now() - start;
          if (duration > 500) {
            const rect = target.getBoundingClientRect?.();
            buffer.current.push({
              sessao_id: sessaoId.current,
              tipo: 'hover',
              pagina: location.pathname,
              elemento: key.slice(0, 200),
              coordenada_x: rect ? Math.round(rect.left + rect.width / 2) : null,
              coordenada_y: rect ? Math.round(rect.top + rect.height / 2) : null,
              duracao_ms: Math.min(duration, 30000),
              largura_tela: window.innerWidth,
              altura_tela: window.innerHeight,
            });
          }
          hoverStart.current.delete(key);
        }
      }, HOVER_DEBOUNCE_MS));
    };

    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('mouseover', handleMouseOver);
      hoverTimers.current.forEach((t) => clearTimeout(t));
      hoverTimers.current.clear();
      hoverStart.current.clear();
    };
  }, [location.pathname, enabled]);
}

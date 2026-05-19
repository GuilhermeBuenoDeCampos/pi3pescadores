function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function removeApiSuffix(url) {
  return normalizeUrl(url).replace(/\/api$/, '');
}

const defaultBackendUrl = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://pi3pescadores.onrender.com';

const configuredApiUrl = normalizeUrl(import.meta.env.VITE_API_URL);
const configuredBackendUrl = normalizeUrl(import.meta.env.VITE_BACKEND_URL);

export const API_URL = configuredApiUrl || `${configuredBackendUrl || defaultBackendUrl}/api`;
export const BACKEND_URL = configuredApiUrl
  ? removeApiSuffix(configuredApiUrl)
  : configuredBackendUrl || defaultBackendUrl;

if (import.meta.env.DEV) {
  console.info('[config] API_URL:', API_URL);
  console.info('[config] BACKEND_URL:', BACKEND_URL);
}

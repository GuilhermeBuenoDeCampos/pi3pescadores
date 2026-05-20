import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { clearAuthSession, getAuthToken, getAuthUser } from '../services/api';

function isTokenValid(token) {
  if (!token) {
    return false;
  }

  try {
    const encodedPayload = token.split('.')[1] || '';
    const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(paddedPayload));
    return !payload.exp || payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function ProtectedRoute({ children, roles, redirectTo = '/login', unauthorizedTo = '/' }) {
  const [, setSessionVersion] = useState(0);
  const token = getAuthToken();
  const user = getAuthUser();
  const hasValidSession = Boolean(token && user && isTokenValid(token));

  useEffect(() => {
    const handleSessionChange = () => {
      setSessionVersion((current) => current + 1);
    };

    window.addEventListener('auth-session-changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);

    return () => {
      window.removeEventListener('auth-session-changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, []);

  useEffect(() => {
    if (token && !isTokenValid(token)) {
      clearAuthSession();
    }
  }, [token]);

  if (!hasValidSession) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles && !roles.includes(user.tipo_usuario)) {
    return <Navigate to={unauthorizedTo} replace />;
  }

  return children;
}

export default ProtectedRoute;

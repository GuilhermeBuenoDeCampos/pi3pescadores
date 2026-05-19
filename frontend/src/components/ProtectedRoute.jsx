import { Navigate } from 'react-router-dom';
import { getAuthToken, getAuthUser } from '../services/api';

function ProtectedRoute({ children, roles }) {
  const token = getAuthToken();
  const user = getAuthUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.tipo_usuario)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;

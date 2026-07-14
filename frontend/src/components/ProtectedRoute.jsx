import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Componente para proteger rutas que requieren autenticación.
 * Si el usuario no está autenticado, lo redirige a /auth.
 * Si se requiere un rol específico y el usuario no lo tiene, lo redirige al inicio.
 */
const ProtectedRoute = ({ usuario, rolesPermitidos, children }) => {
  const location = useLocation();

  if (!usuario) {
    // Redirigir al login y guardar la ruta a la que intentaba ir
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const userRole = usuario.rol || 'usuario'; // Asumimos 'usuario' si no tiene rol explícito
    if (!rolesPermitidos.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

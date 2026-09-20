import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import type { Role } from '../lib/api-types';
import { roleHomePath } from '../lib/role-routing';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EE]">
        <div className="w-8 h-8 border-4 border-[#D49B37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  // Un rôle qui arrive sur un portail qui n'est pas le sien (ancien favori,
  // retour après connexion vers la page précédente...) est renvoyé vers son
  // propre espace plutôt que vers l'accueil.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <>{children}</>;
};

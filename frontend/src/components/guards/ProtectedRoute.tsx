import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  requiredRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRoles }) => {
  const { user, isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-night flex items-center justify-center text-chalk-muted font-sans text-xs">
        Verifying session…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-sm p-6 bg-panel border border-hairline space-y-3">
          <h2 className="font-display text-lg font-bold text-chalk">Access restricted</h2>
          <p className="text-xs text-chalk-muted leading-relaxed">
            This screen requires {requiredRoles.join(' or ')} permissions. Your current role is {user.role}.
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-night hover:bg-panel-light text-chalk text-xs border border-hairline transition-colors"
          >
            Return to overview
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireDevOrAdmin?: boolean;
  requireOpsOrAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireDevOrAdmin = false, requireOpsOrAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles(user?.id);

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireDevOrAdmin && !isAdmin && !roles.includes('dev')) {
    return <Navigate to="/" replace />;
  }

  if (requireOpsOrAdmin && !isAdmin && !roles.includes('ops')) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

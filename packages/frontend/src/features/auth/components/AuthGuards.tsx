import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore.js';

// 1. PUBLIC ONLY GUARD: Blocks logged-in users from seeing login/signup pages
export function PublicRoute() {
  const user = useAuthStore((state) => state.user);
  return !user ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// 2. UNIFIED SECURE GUARD: Handles simple authentication AND role restriction
interface RoleGuardProps {
  allowedRoles: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[];
}

export function RoleProtectedRoute({ allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) return <Navigate to="/login" replace />;

  const hasAccess = allowedRoles.includes(user.role);
  return hasAccess ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
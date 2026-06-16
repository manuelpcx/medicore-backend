import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export function ProtectedRoute() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  if (!isAuth) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  if (isAuth) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

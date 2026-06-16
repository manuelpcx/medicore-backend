import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { ListSkeleton } from '../components/ui/Skeleton';

const LoginPage          = lazy(() => import('../pages/LoginPage'));
const RegisterPage       = lazy(() => import('../pages/RegisterPage'));
const DoctorEntryPage    = lazy(() => import('../pages/DoctorEntryPage'));
const DoctorDashboardPage = lazy(() => import('../pages/DoctorDashboardPage'));
const DashboardPage  = lazy(() => import('../pages/DashboardPage'));
const HistorialPage  = lazy(() => import('../pages/HistorialPage'));
const MedicamentosPage = lazy(() => import('../pages/MedicamentosPage'));
const ExamenesPage   = lazy(() => import('../pages/ExamenesPage'));
const AlergiasPage   = lazy(() => import('../pages/AlergiasPage'));
const VacunasPage    = lazy(() => import('../pages/VacunasPage'));
const PerfilPage     = lazy(() => import('../pages/PerfilPage'));
const NotFoundPage   = lazy(() => import('../pages/NotFoundPage'));

const Loader = () => (
  <div style={{ padding: 40 }}><ListSkeleton count={4} /></div>
);

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public-only routes */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/historial" element={<HistorialPage />} />
              <Route path="/medicamentos" element={<MedicamentosPage />} />
              <Route path="/examenes" element={<ExamenesPage />} />
              <Route path="/alergias" element={<AlergiasPage />} />
              <Route path="/vacunas" element={<VacunasPage />} />
              <Route path="/perfil" element={<PerfilPage />} />
            </Route>
          </Route>

          {/* Rutas públicas para médicos — sin autenticación */}
          <Route path="/doctor" element={<DoctorEntryPage />} />
          <Route path="/doctor/:code" element={<DoctorDashboardPage />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

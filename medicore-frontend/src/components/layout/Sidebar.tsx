import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth.api';
import { toast } from '../../store/toast.store';
import { QRModal } from '../modals/QRModal';

const NAV = [
  { to: '/dashboard', icon: '⊞', label: 'Inicio' },
  { to: '/historial', icon: '📋', label: 'Historial' },
  { to: '/medicamentos', icon: '💊', label: 'Medicamentos' },
  { to: '/examenes', icon: '🔬', label: 'Exámenes' },
  { to: '/alergias', icon: '⚠', label: 'Alergias' },
  { to: '/vacunas', icon: '💉', label: 'Vacunas' },
  { to: '/perfil', icon: '👤', label: 'Perfil' },
];

export function Sidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate('/login');
    toast.info('Sesión cerrada');
  };

  return (
    <>
      <aside style={{
        width: collapsed ? 64 : 'var(--sidebar-w)',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0,
        zIndex: 100, transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '20px 0' : '24px 20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: 'DM Serif Display, serif', fontSize: 16, flexShrink: 0,
            marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0,
          }}>M</div>
          {!collapsed && <span className="serif" style={{ fontSize: 20, color: 'var(--accent)' }}>Medi-History</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: 10, padding: collapsed ? '10px 0' : '10px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                margin: '2px 8px', borderRadius: 8,
                background: isActive ? 'var(--accent2)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text2)',
                fontWeight: isActive ? 500 : 400,
                fontSize: 14, textDecoration: 'none',
                transition: 'all 0.12s',
              })}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* QR Button */}
        <div style={{ padding: collapsed ? '12px 8px' : '12px 16px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setQrOpen(true)}
            title="Compartir con médico"
            style={{
              width: '100%', padding: collapsed ? '10px 0' : '10px 12px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 16 }}>🔗</span>
            {!collapsed && 'Compartir QR'}
          </button>
        </div>

        {/* User + logout */}
        <div style={{
          padding: collapsed ? '12px 8px' : '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--accent2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontWeight: 600, fontSize: 13, flexShrink: 0,
          }}>
            {user?.nombre?.[0]?.toUpperCase() ?? '?'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.nombre}
              </div>
              <button
                onClick={handleLogout}
                style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute', top: 24, right: collapsed ? -12 : -12,
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 10, color: 'var(--text2)', zIndex: 10,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      <QRModal open={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  );
}

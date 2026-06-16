import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-w)',
        padding: '32px 36px',
        minHeight: '100vh',
        maxWidth: 'calc(100vw - var(--sidebar-w))',
        transition: 'margin-left 0.2s ease',
        overflowX: 'hidden',
      }}>
        <Outlet />
      </main>
    </div>
  );
}

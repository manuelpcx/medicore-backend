import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', flexDirection: 'column', gap: 16, textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 72 }}>🩺</div>
      <h1 className="serif" style={{ fontSize: 48, fontWeight: 400, color: 'var(--accent)' }}>404</h1>
      <p style={{ fontSize: 18, color: 'var(--text2)' }}>Página no encontrada</p>
      <p style={{ color: 'var(--text3)', maxWidth: 320 }}>
        La página que buscas no existe o fue movida.
      </p>
      <Link to="/dashboard">
        <Button size="lg">Ir al inicio</Button>
      </Link>
    </div>
  );
}

import React from 'react';
import { createPortal } from 'react-dom';
import { useToastStore, type ToastType } from '../../store/toast.store';

const ICONS: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};

const COLORS: Record<ToastType, { bg: string; color: string; icon: string }> = {
  success: { bg: 'var(--accent2)', color: 'var(--accent)', icon: 'var(--accent)' },
  error:   { bg: 'var(--red2)', color: 'var(--text)', icon: 'var(--red)' },
  info:    { bg: 'var(--blue2)', color: 'var(--text)', icon: 'var(--blue)' },
  warning: { bg: 'var(--amber2)', color: 'var(--text)', icon: 'var(--amber)' },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();
  if (!toasts.length) return null;

  return createPortal(
    <div style={{
      position: 'fixed', bottom: 24, right: 24, display: 'flex',
      flexDirection: 'column', gap: 8, zIndex: 2000,
    }}>
      {toasts.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: `1px solid var(--border)`,
              borderLeft: `4px solid ${c.icon}`,
              padding: '12px 16px', borderRadius: 10,
              boxShadow: 'var(--shadow)', cursor: 'pointer',
              animation: 'toastIn 0.2s ease',
              minWidth: 280, maxWidth: 360,
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: c.bg, color: c.icon,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {ICONS[t.type]}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text)', flex: 1 }}>{t.message}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

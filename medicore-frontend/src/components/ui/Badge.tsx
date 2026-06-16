import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface Props {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<BadgeVariant, React.CSSProperties> = {
  default:  { background: 'var(--surface2)', color: 'var(--text2)' },
  success:  { background: 'var(--accent2)', color: 'var(--accent)' },
  warning:  { background: 'var(--amber2)', color: 'var(--amber)' },
  danger:   { background: 'var(--red2)', color: 'var(--red)' },
  info:     { background: 'var(--blue2)', color: 'var(--blue)' },
  purple:   { background: 'var(--purple2)', color: 'var(--purple)' },
};

export function Badge({ variant = 'default', size = 'md', children }: Props) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: size === 'sm' ? '2px 7px' : '3px 9px',
      borderRadius: 20, fontWeight: 500,
      fontSize: size === 'sm' ? 11 : 12,
      letterSpacing: 0.2,
      ...VARIANTS[variant],
    }}>
      {children}
    </span>
  );
}

// Convenience mappers
export function resultadoBadge(v?: string) {
  if (v === 'normal') return <Badge variant="success">Normal</Badge>;
  if (v === 'alterado') return <Badge variant="warning">Alterado</Badge>;
  return <Badge variant="default">Pendiente</Badge>;
}

export function severidadBadge(v?: string) {
  if (v === 'severa') return <Badge variant="danger">Severa</Badge>;
  if (v === 'moderada') return <Badge variant="warning">Moderada</Badge>;
  return <Badge variant="success">Leve</Badge>;
}

export function tipoBadge(v?: string) {
  const map: Record<string, BadgeVariant> = {
    control: 'success', urgencia: 'danger', especialidad: 'info', preventivo: 'purple',
  };
  const label: Record<string, string> = {
    control: 'Control', urgencia: 'Urgencia', especialidad: 'Especialidad', preventivo: 'Preventivo',
  };
  return <Badge variant={map[v ?? ''] ?? 'default'}>{label[v ?? ''] ?? v}</Badge>;
}

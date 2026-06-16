import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary', size = 'md', loading, children, disabled, style, ...rest
}: Props) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 'var(--radius-btn)', fontWeight: 500, border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s, opacity 0.15s',
    opacity: disabled || loading ? 0.6 : 1,
    whiteSpace: 'nowrap',
    ...(size === 'sm' ? { padding: '6px 12px', fontSize: 13 } :
        size === 'lg' ? { padding: '12px 24px', fontSize: 16 } :
                        { padding: '8px 16px', fontSize: 14 }),
    ...(variant === 'primary' ? { background: 'var(--accent)', color: '#fff' } :
        variant === 'secondary' ? { background: 'var(--accent2)', color: 'var(--accent)' } :
        variant === 'ghost' ? { background: 'transparent', color: 'var(--text2)' } :
        { background: 'var(--red2)', color: 'var(--red)' }),
    ...style,
  };

  return (
    <button {...rest} disabled={disabled || loading} style={base}>
      {loading && <Spinner size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

import React from 'react';

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, style, onClick, hoverable }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
        cursor: hoverable ? 'pointer' : 'default',
        transition: hoverable ? 'box-shadow 0.15s, transform 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={hoverable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      } : undefined}
    >
      {children}
    </div>
  );
}

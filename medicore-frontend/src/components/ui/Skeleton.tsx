import React from 'react';

interface Props {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ height = 20, width = '100%', radius = 8, style }: Props) {
  return (
    <div
      style={{
        height, width, borderRadius: radius,
        background: 'var(--surface2)',
        animation: 'pulse 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-card)', padding: 20,
    }}>
      <Skeleton height={14} width="40%" style={{ marginBottom: 12 }} />
      <Skeleton height={22} width="60%" style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="80%" />
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

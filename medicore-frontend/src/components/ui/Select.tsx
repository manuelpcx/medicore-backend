import React from 'react';

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, style, ...rest }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{label}</label>
      )}
      <select
        ref={ref}
        {...rest}
        style={{
          padding: '9px 12px',
          borderRadius: 8,
          border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14,
          outline: 'none',
          width: '100%',
          cursor: 'pointer',
          ...style,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  ),
);
Select.displayName = 'Select';

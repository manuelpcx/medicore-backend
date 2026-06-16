import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ label, error, helper, style, ...rest }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>
          {label}
        </label>
      )}
      <input
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
          transition: 'border-color 0.15s',
          width: '100%',
          ...style,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--accent)';
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border)';
          rest.onBlur?.(e);
        }}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
      {helper && !error && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{helper}</span>}
    </div>
  ),
);
Input.displayName = 'Input';

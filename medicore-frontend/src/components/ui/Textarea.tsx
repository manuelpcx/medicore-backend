import React from 'react';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, style, ...rest }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>{label}</label>}
      <textarea
        ref={ref}
        {...rest}
        style={{
          padding: '9px 12px', borderRadius: 8,
          border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          background: 'var(--surface)', color: 'var(--text)',
          fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 80,
          fontFamily: 'inherit', transition: 'border-color 0.15s', ...style,
        }}
        onFocus={(e) => { if (!error) e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  ),
);
Textarea.displayName = 'Textarea';

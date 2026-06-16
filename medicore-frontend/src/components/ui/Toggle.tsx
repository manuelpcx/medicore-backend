import React, { useId } from 'react';

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, disabled, label, description, size = 'md' }: Props) {
  const id = useId();
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const dot = size === 'sm' ? 12 : 16;
  const offset = size === 'sm' ? 3 : 3;
  const travel = w - dot - offset * 2;

  return (
    <div style={{ display: 'flex', alignItems: label ? 'flex-start' : 'center', gap: 10, opacity: disabled ? 0.5 : 1 }}>
      {/* Switch */}
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          position: 'relative',
          width: w, height: h,
          borderRadius: h,
          background: checked ? 'var(--accent)' : 'var(--border)',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'background 0.2s',
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent2)'; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Knob */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: offset, left: offset,
            width: dot, height: dot,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            transform: checked ? `translateX(${travel}px)` : 'translateX(0)',
            transition: 'transform 0.2s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </button>

      {/* Label + description */}
      {(label || description) && (
        <label htmlFor={id} style={{ cursor: disabled ? 'default' : 'pointer', userSelect: 'none' }}>
          {label && (
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
              {label}
            </div>
          )}
          {description && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>
              {description}
            </div>
          )}
        </label>
      )}
    </div>
  );
}

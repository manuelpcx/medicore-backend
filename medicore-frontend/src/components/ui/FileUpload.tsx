import React, { useRef, useState } from 'react';

interface Props {
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  error?: string;
}

export function FileUpload({ value, onChange, accept = '.pdf,.jpg,.jpeg,.png,.webp', maxSizeMB = 20, label, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sizeError, setSizeError] = useState('');

  const handleFile = (file: File | null) => {
    setSizeError('');
    if (!file) { onChange(null); return; }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setSizeError(`El archivo supera el límite de ${maxSizeMB}MB`);
      return;
    }
    onChange(file);
  };

  const displayError = sizeError || error;

  return (
    <div>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{label}</label>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          handleFile(e.dataTransfer.files[0] ?? null);
        }}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : displayError ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--accent2)' : 'var(--surface)',
          transition: 'all 0.15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {value ? (
          <div>
            <div style={{ fontSize: 24, marginBottom: 4 }}>
              {value.type === 'application/pdf' ? '📄' : '🖼️'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{value.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              {(value.size / 1024 / 1024).toFixed(2)} MB — Click para cambiar
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>
              Arrastra un archivo o haz click
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              PDF, JPG, PNG, WEBP — máximo {maxSizeMB}MB
            </div>
          </div>
        )}
      </div>
      {displayError && <span style={{ fontSize: 12, color: 'var(--red)', marginTop: 4, display: 'block' }}>{displayError}</span>}
    </div>
  );
}

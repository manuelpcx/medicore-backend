import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyAccessCode } from '../api/access-codes.api';
import { useDoctorStore } from '../store/doctor.store';
import { extractError } from '../utils/format';

/**
 * Página pública de entrada para médicos.
 * Acepta un código de 8 caracteres y redirige al dashboard médico.
 */
export default function DoctorEntryPage() {
  const navigate = useNavigate();
  const { setSnapshot } = useDoctorStore();
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Normaliza el input: mayúsculas, solo alfanum, máx 8 chars
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setRaw(clean);
    setError('');
  };

  // Display con guión en el medio: ABCD-EFGH
  const display = raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (raw.length < 6) { setError('El código debe tener al menos 6 caracteres'); return; }

    setLoading(true);
    setError('');
    try {
      const snapshot = await verifyAccessCode(raw);
      // El backend debería devolver expires_at; usamos 10 min como fallback
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      setSnapshot(snapshot, expiresAt);
      navigate(`/doctor/${raw}`);
    } catch (err) {
      const msg = extractError(err);
      // Mensajes amigables para códigos inválidos
      if (msg.toLowerCase().includes('expirado') || msg.toLowerCase().includes('expired')) {
        setError('El código ha expirado. Pide al paciente que genere uno nuevo.');
      } else if (msg.toLowerCase().includes('inválido') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('not found')) {
        setError('Código inválido. Verifica que lo copiaste correctamente.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* Card central */}
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={logoWrapStyle}>
            <div style={logoDotStyle}>M</div>
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: 'var(--accent)' }}>
              Medi-History
            </span>
          </div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, fontWeight: 400, marginTop: 20, marginBottom: 6 }}>
            Acceso médico
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.5 }}>
            Ingresa el código de 8 caracteres que<br />
            el paciente generó desde su app.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Código input */}
          <div>
            <label style={labelStyle}>Código de acceso</label>
            <input
              autoFocus
              value={display}
              onChange={handleInput}
              placeholder="XXXX-XXXX"
              spellCheck={false}
              autoComplete="off"
              style={{
                ...codeInputStyle,
                borderColor: error ? 'var(--red)' : 'var(--border)',
              }}
              onFocus={(e) => { if (!error) e.target.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
            />
            {/* Indicador de progreso visual */}
            <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8, height: 4, borderRadius: 2,
                    background: i < raw.length ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={errorBoxStyle}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading || raw.length < 6} style={submitBtnStyle(loading || raw.length < 6)}>
            {loading ? (
              <>
                <svg width={16} height={16} viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Verificando…
              </>
            ) : (
              'Acceder al historial'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          Este acceso es temporal y de solo lectura.<br />
          Autorizado por el paciente. No se almacenan datos.
        </p>
      </div>

      {/* Bottom branding */}
      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text3)' }}>
        Medi-History · Historial médico personal
      </p>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────── */
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: '40px 36px',
  width: '100%',
  maxWidth: 400,
  boxShadow: 'var(--shadow)',
  animation: 'fadeIn 0.2s ease',
};

const logoWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 16px',
  background: 'var(--accent2)',
  borderRadius: 40,
};

const logoDotStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  background: 'var(--accent)', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'DM Serif Display, serif', fontSize: 15,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text2)',
  marginBottom: 8,
  textAlign: 'center',
};

const codeInputStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'center',
  fontFamily: '"DM Mono", "Courier New", monospace',
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: 8,
  padding: '14px 16px',
  borderRadius: 10,
  border: '2px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const errorBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  background: 'var(--red2)',
  border: '1px solid #f5c6c2',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  color: 'var(--red)',
  lineHeight: 1.4,
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '12px 20px',
  background: disabled ? 'var(--surface2)' : 'var(--accent)',
  color: disabled ? 'var(--text3)' : '#fff',
  border: 'none',
  borderRadius: 'var(--radius-btn)',
  fontSize: 15,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'background 0.15s',
});

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useGenerateAccessCode, useRevokeAccessCode } from '../../hooks/useAccessCode';

interface Props {
  open: boolean;
  onClose: () => void;
}

const TOTAL = 10 * 60; // 600 seconds

export function QRModal({ open, onClose }: Props) {
  const generate = useGenerateAccessCode();
  const revoke = useRevokeAccessCode();
  const [remaining, setRemaining] = useState(TOTAL);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate code when modal opens
  useEffect(() => {
    if (open) {
      setRemaining(TOTAL);
      generate.mutate();
    }
  }, [open]);

  // Start countdown after we have a code
  useEffect(() => {
    if (!generate.data) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const expiresAt = new Date(generate.data.expires_at).getTime();
    timerRef.current = setInterval(() => {
      const secs = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        onClose();
      }
    }, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [generate.data]);

  const handleRevoke = async () => {
    await revoke.mutateAsync();
    if (timerRef.current) clearInterval(timerRef.current);
    onClose();
  };

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  const progress = remaining / TOTAL;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - progress);

  const code = generate.data?.code ?? '';
  const chunks = code.match(/.{1,4}/g) ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Compartir con médico" maxWidth={420}>
      {generate.isPending && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          Generando código…
        </div>
      )}

      {generate.data && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* Countdown ring */}
          <div style={{ position: 'relative', width: 110, height: 110 }}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="45" fill="none" stroke="var(--surface2)" strokeWidth="8" />
              <circle
                cx="55" cy="55" r="45" fill="none"
                stroke={remaining < 60 ? 'var(--red)' : 'var(--accent)'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 55 55)"
                style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: remaining < 60 ? 'var(--red)' : 'var(--text)', lineHeight: 1 }}>
                {mins}:{secs}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>restantes</span>
            </div>
          </div>

          {/* Code */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
              Comparte este código con tu médico
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {chunks.map((chunk, i) => (
                <span key={i} style={{
                  fontFamily: 'monospace', fontSize: 28, fontWeight: 700,
                  letterSpacing: 4, color: 'var(--accent)',
                  background: 'var(--accent2)', padding: '8px 14px',
                  borderRadius: 8, lineHeight: 1,
                }}>
                  {chunk}
                </span>
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{
            background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px',
            fontSize: 13, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.5,
          }}>
            ℹ️ El médico ingresa el código en su terminal.<br />
            El acceso expira automáticamente o puedes revocarlo ahora.
          </div>

          {/* Revoke */}
          <Button
            variant="danger"
            onClick={handleRevoke}
            loading={revoke.isPending}
            style={{ width: '100%' }}
          >
            Revocar acceso ahora
          </Button>
        </div>
      )}

      {generate.isError && (
        <div style={{ textAlign: 'center', color: 'var(--red)', padding: 20 }}>
          No se pudo generar el código. Inténtalo de nuevo.
        </div>
      )}
    </Modal>
  );
}

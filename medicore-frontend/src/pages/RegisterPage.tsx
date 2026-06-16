import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { extractError } from '../utils/format';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  fecha_nacimiento: z.string().optional(),
  tipo_sangre: z.string().optional(),
  consent_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y la política de privacidad para continuar' }),
  }),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const consentChecked = watch('consent_accepted');

  const onSubmit = async (values: Form) => {
    setServerError('');
    try {
      const res = await authApi.register(values);
      setAuth(res.user, res.access_token, res.refresh_token);
      navigate('/dashboard');
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={logoStyle}>M</div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400, marginBottom: 6 }}>
            Crear cuenta
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Regístrate en Medi-History</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Campos personales */}
          <Input
            label="Nombre completo"
            placeholder="Jesús Méndez"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            helper="Mínimo 8 caracteres"
            {...register('password')}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Fecha de nacimiento"
              type="date"
              error={errors.fecha_nacimiento?.message}
              {...register('fecha_nacimiento')}
            />
            <Select
              label="Tipo de sangre"
              options={[
                { value: '', label: 'No sé' },
                ...TIPOS_SANGRE.map((v) => ({ value: v, label: v })),
              ]}
              {...register('tipo_sangre')}
            />
          </div>

          {/* ── Consentimiento (Ley 19.628 / 21.719) ────────────────────── */}
          <div style={{
            background: consentChecked ? 'var(--accent2)' : 'var(--surface2)',
            border: `1.5px solid ${errors.consent_accepted ? 'var(--red)' : consentChecked ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '14px 16px',
            transition: 'all 0.15s',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              {/* Checkbox personalizado */}
              <div style={{ position: 'relative', flexShrink: 0, marginTop: 1 }}>
                <input
                  type="checkbox"
                  {...register('consent_accepted')}
                  style={{ position: 'absolute', opacity: 0, width: 18, height: 18, cursor: 'pointer' }}
                />
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  background: consentChecked ? 'var(--accent)' : 'var(--surface)',
                  border: `2px solid ${consentChecked ? 'var(--accent)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', pointerEvents: 'none',
                }}>
                  {consentChecked && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4, display: 'block' }}>
                  Acepto los{' '}
                  <a
                    href="/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    Términos de Uso
                  </a>
                  {' '}y la{' '}
                  <a
                    href="/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--accent)', textDecoration: 'underline' }}
                  >
                    Política de Privacidad
                  </a>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, display: 'block', lineHeight: 1.5 }}>
                  Autorizo el tratamiento de mis datos personales de salud según la Ley 19.628 y Ley 21.719 de Chile.
                  Puedes eliminar tu cuenta en cualquier momento desde tu perfil.
                </span>
              </div>
            </label>

            {errors.consent_accepted && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠</span>
                <span>{errors.consent_accepted.message}</span>
              </div>
            )}
          </div>

          {/* Error del servidor */}
          {serverError && (
            <div style={{
              background: 'var(--red2)', color: 'var(--red)',
              fontSize: 13, padding: '10px 14px', borderRadius: 8,
              border: '1px solid #f5c6c2',
            }}>
              {serverError}
            </div>
          )}

          <Button type="submit" loading={isSubmitting} size="lg" style={{ marginTop: 4 }}>
            Crear cuenta
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text2)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

/* ── Styles ── */
const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--bg)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)', padding: '36px 32px',
  width: '100%', maxWidth: 480, boxShadow: 'var(--shadow)',
  animation: 'fadeIn 0.2s ease',
};
const logoStyle: React.CSSProperties = {
  width: 48, height: 48, background: 'var(--accent)', borderRadius: 12,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontFamily: 'DM Serif Display, serif', fontSize: 22, marginBottom: 10,
};

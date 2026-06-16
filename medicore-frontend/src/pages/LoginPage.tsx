import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/auth.store';
import { extractError } from '../utils/format';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: Form) => {
    setServerError('');
    try {
      const res = await authApi.login(values);
      setAuth(res.user, res.access_token, res.refresh_token);
      navigate('/dashboard');
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={logoStyle}>M</div>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 400, marginBottom: 6 }}>Medi-History</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Tu historial médico, siempre contigo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Correo electrónico" type="email" placeholder="tu@email.com"
            error={errors.email?.message} {...register('email')} />
          <Input label="Contraseña" type="password" placeholder="••••••••"
            error={errors.password?.message} {...register('password')} />

          {serverError && (
            <div style={{ background: 'var(--red2)', color: 'var(--red)', fontSize: 13, padding: '10px 14px', borderRadius: 8, border: '1px solid #f5c6c2' }}>
              {serverError}
            </div>
          )}

          <Button type="submit" loading={isSubmitting} size="lg" style={{ marginTop: 4 }}>
            Iniciar sesión
          </Button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text2)' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Regístrate</Link>
        </p>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--bg)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-card)', padding: '40px 36px',
  width: '100%', maxWidth: 420, boxShadow: 'var(--shadow)',
  animation: 'fadeIn 0.2s ease',
};

const logoStyle: React.CSSProperties = {
  width: 52, height: 52, background: 'var(--accent)',
  borderRadius: 14, display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', color: '#fff',
  fontFamily: 'DM Serif Display, serif', fontSize: 24,
  marginBottom: 12,
};

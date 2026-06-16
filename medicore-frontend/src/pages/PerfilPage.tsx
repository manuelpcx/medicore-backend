import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { usePatient, useUpdatePatient } from '../hooks/usePatient';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks/useNotifications';
import { useAuthStore } from '../store/auth.store';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Toggle } from '../components/ui/Toggle';
import { Skeleton } from '../components/ui/Skeleton';
import { fDate, extractError } from '../utils/format';
import { authApi } from '../api/auth.api';
import { toast } from '../store/toast.store';
import type { UpdatePatientDto, NotificationPreferences } from '../types';

// ── Schema del perfil ───────────────────────────────────────────────────────
const schema = z.object({
  peso: z.number({ coerce: true }).optional(),
  altura: z.number({ coerce: true }).optional(),
  presion_arterial: z.string().optional(),
  frecuencia_cardiaca: z.number({ coerce: true }).optional(),
  temperatura: z.number({ coerce: true }).optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contacto_emergencia: z.string().optional(),
  telefono_emergencia: z.string().optional(),
});
type Form = z.infer<typeof schema>;

// ── Tabs disponibles ────────────────────────────────────────────────────────
const TABS = [
  { key: 'personal',       label: 'Datos personales' },
  { key: 'vitales',        label: 'Signos vitales' },
  { key: 'emergencia',     label: 'Emergencia' },
  { key: 'notificaciones', label: '🔔 Notificaciones' },
] as const;
type TabKey = typeof TABS[number]['key'];

// ── Sección de notificaciones ───────────────────────────────────────────────
function NotificationsSection({ email }: { email?: string }) {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    updatePrefs.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}
      </div>
    );
  }

  const notifItems: Array<{
    key: keyof NotificationPreferences;
    label: string;
    description: string;
  }> = [
    {
      key: 'daily_meds_enabled',
      label: 'Resumen diario',
      description: 'Un email cada mañana a las 8:00 con todos tus medicamentos del día',
    },
    {
      key: 'single_med_enabled',
      label: 'Recordatorio por medicamento',
      description: 'Un aviso puntual a la hora que configures en cada medicamento',
    },
    {
      key: 'appointments_enabled',
      label: 'Próximos controles',
      description: 'Un aviso la tarde anterior a cada control médico agendado',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Subtitle */}
      <div style={{
        background: 'var(--surface2)', borderRadius: 8,
        padding: '10px 14px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, color: 'var(--text2)',
      }}>
        <span>📧</span>
        <span>
          Te enviamos recordatorios a <strong style={{ color: 'var(--text)' }}>{email ?? '…'}</strong>
        </span>
      </div>

      {/* Toggle items */}
      {notifItems.map((item) => {
        const isOn = prefs?.[item.key] ?? true;
        const isSaving = updatePrefs.isPending && updatePrefs.variables
          ? item.key in (updatePrefs.variables as object)
          : false;

        return (
          <div
            key={item.key}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              background: isOn ? 'var(--surface)' : 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 10,
              transition: 'background 0.15s',
              gap: 12,
            }}
          >
            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>
                {item.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>
                {item.description}
              </div>
            </div>

            {/* Toggle */}
            <Toggle
              checked={isOn}
              disabled={isSaving || updatePrefs.isPending}
              onChange={(value) => handleToggle(item.key, value)}
              size="md"
            />
          </div>
        );
      })}

      {/* Saving indicator */}
      {updatePrefs.isPending && (
        <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
          Guardando…
        </div>
      )}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function PerfilPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { clearAuth } = useAuthStore();
  const { data: patient, isLoading } = usePatient();
  const update = useUpdatePatient();
  const [tab, setTab] = useState<TabKey>('personal');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset } = useForm<Form>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (patient?.perfil) {
      const p = patient.perfil;
      reset({
        peso: p.peso ?? undefined,
        altura: p.altura ?? undefined,
        presion_arterial: p.presion_arterial ?? '',
        frecuencia_cardiaca: p.frecuencia_cardiaca ?? undefined,
        temperatura: p.temperatura ?? undefined,
        telefono: p.telefono ?? '',
        direccion: p.direccion ?? '',
        contacto_emergencia: p.contacto_emergencia ?? '',
        telefono_emergencia: p.telefono_emergencia ?? '',
      });
    }
  }, [patient]);

  const onSubmit = async (values: Form) => {
    await update.mutateAsync(values as UpdatePatientDto);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      clearAuth();
      navigate('/login');
      toast.info('Tu cuenta ha sido eliminada permanentemente');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease', maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>Mi perfil</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>
          Gestiona tus datos personales y médicos
        </p>
      </div>

      {/* Avatar card */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--accent2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)', fontWeight: 700, fontSize: 22, flexShrink: 0,
        }}>
          {user?.nombre?.[0]?.toUpperCase()}
        </div>
        <div>
          {isLoading ? (
            <Skeleton width={180} height={18} />
          ) : (
            <div style={{ fontWeight: 600, fontSize: 18 }}>{user?.nombre}</div>
          )}
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{user?.email}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {user?.tipo_sangre && `Tipo de sangre: ${user.tipo_sangre} · `}
            {user?.fecha_nacimiento && `Nacimiento: ${fDate(user.fecha_nacimiento)}`}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap',
        background: 'var(--surface)', padding: 4, borderRadius: 10,
        border: '1px solid var(--border)', width: 'fit-content',
      }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--text2)',
              fontWeight: 500, fontSize: 13, fontFamily: 'inherit', transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: notificaciones — fuera del form */}
      {tab === 'notificaciones' ? (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <h3 className="serif" style={{ fontSize: 17, fontWeight: 400, marginBottom: 4 }}>
              Recordatorios por email
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)' }}>
              Activa o desactiva los recordatorios automáticos. Los cambios se guardan al instante.
            </p>
          </div>
          <NotificationsSection email={user?.email} />
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tab === 'personal' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Input label="Teléfono" placeholder="+52 55 1234 5678" {...register('telefono')} />
                </div>
                <Input label="Dirección" placeholder="Calle, Colonia, Ciudad" {...register('direccion')} />
              </>
            )}

            {tab === 'vitales' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Input label="Peso (kg)" type="number" step="0.1" placeholder="75.5" {...register('peso')} />
                  <Input label="Altura (m)" type="number" step="0.01" placeholder="1.75" {...register('altura')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Input label="Presión arterial" placeholder="120/80" {...register('presion_arterial')} />
                  <Input label="Frecuencia cardiaca (bpm)" type="number" placeholder="72" {...register('frecuencia_cardiaca')} />
                </div>
                <Input label="Temperatura (°C)" type="number" step="0.1" placeholder="36.6"
                  {...register('temperatura')} style={{ maxWidth: 180 }} />
              </>
            )}

            {tab === 'emergencia' && (
              <>
                <Input label="Contacto de emergencia" placeholder="Nombre y relación"
                  {...register('contacto_emergencia')} />
                <Input label="Teléfono de emergencia" placeholder="+52 55 8765 4321"
                  {...register('telefono_emergencia')} />
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" loading={update.isPending}>Guardar cambios</Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Zona de peligro — solo en tab personal ───────────────────── */}
      {tab === 'personal' && (
        <div style={{ marginTop: 32 }}>
          <div style={{
            border: '1.5px solid #f5c6c2',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              background: 'var(--red2)', padding: '12px 20px',
              borderBottom: '1px solid #f5c6c2',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>⚠</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--red)' }}>
                Zona de peligro
              </span>
            </div>

            {/* Content */}
            <div style={{ background: 'var(--surface)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>
                    Eliminar cuenta permanentemente
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 3, lineHeight: 1.5 }}>
                    Elimina tu cuenta y todos tus datos médicos de forma irreversible.<br />
                    Derecho de supresión — Ley 19.628 / Ley 21.719 (Chile).
                  </div>
                </div>
                <Button
                  variant="danger"
                  onClick={() => { setDeleteConfirmText(''); setDeleteModal(true); }}
                >
                  Eliminar mi cuenta
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmación de eliminación ────────────────────────── */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Eliminar cuenta"
        maxWidth={440}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={deleteConfirmText !== 'ELIMINAR'}
              onClick={handleDeleteAccount}
            >
              Eliminar permanentemente
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Advertencia */}
          <div style={{
            background: 'var(--red2)', border: '1px solid #f5c6c2',
            borderRadius: 8, padding: '12px 14px',
          }}>
            <p style={{ fontSize: 13, color: 'var(--red)', lineHeight: 1.6, margin: 0 }}>
              <strong>Esta acción es irreversible.</strong> Se eliminarán permanentemente:
            </p>
            <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: 13, color: 'var(--red)', lineHeight: 1.8 }}>
              <li>Tu cuenta y datos personales</li>
              <li>Todo tu historial clínico</li>
              <li>Medicamentos, exámenes y archivos adjuntos</li>
              <li>Alergias, vacunas y accesos médicos</li>
            </ul>
          </div>

          {/* Confirmación por texto */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Escribe <strong style={{ color: 'var(--text)' }}>ELIMINAR</strong> para confirmar
            </label>
            <input
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="ELIMINAR"
              style={{
                width: '100%', padding: '9px 12px',
                border: `1.5px solid ${deleteConfirmText === 'ELIMINAR' ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 8, fontSize: 14,
                background: 'var(--surface)', color: 'var(--text)',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

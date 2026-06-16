import React from 'react';
import { useAuthStore } from '../store/auth.store';
import { usePatient } from '../hooks/usePatient';
import { useHistory } from '../hooks/useHistory';
import { useMedications } from '../hooks/useMedications';
import { useAllergies } from '../hooks/useAllergies';
import { useExams } from '../hooks/useExams';
import { Card } from '../components/ui/Card';
import { Badge, severidadBadge, tipoBadge } from '../components/ui/Badge';
import { ListSkeleton, Skeleton } from '../components/ui/Skeleton';
import { fDate, fRelative } from '../utils/format';

const TIPO_COLOR: Record<string, string> = {
  control: 'var(--accent)', urgencia: 'var(--red)',
  especialidad: 'var(--blue)', preventivo: 'var(--purple)',
};

const VITAL_STATUS = (key: string, val?: number | string) => {
  if (val === undefined || val === null) return 'normal';
  if (key === 'peso' && typeof val === 'number') return (val > 100 || val < 40) ? 'alert' : 'normal';
  if (key === 'temperatura' && typeof val === 'number') return (val > 37.5 || val < 36) ? 'alert' : 'normal';
  if (key === 'frecuencia_cardiaca' && typeof val === 'number') return (val > 100 || val < 60) ? 'alert' : 'normal';
  return 'normal';
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: patient, isLoading: loadingPatient } = usePatient();
  const { data: history = [], isLoading: loadingHistory } = useHistory();
  const { data: medications = [], isLoading: loadingMeds } = useMedications();
  const { data: allergies = [], isLoading: loadingAllergies } = useAllergies();
  const { data: exams = [] } = useExams();

  const activeMeds = medications.filter((m) => m.estado === 'activo');
  const severalAllergies = allergies.filter((a) => a.severidad === 'severa');
  const recentHistory = [...history].slice(0, 3);

  const vitals = patient?.perfil;

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 28, fontWeight: 400 }}>
          Hola, {user?.nombre?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>
          Aquí está el resumen de tu historial médico
        </p>
      </div>

      {/* Severe allergy banner */}
      {severalAllergies.length > 0 && (
        <div style={{
          background: 'var(--red2)', border: '1px solid #f5c6c2', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🚨</span>
          <div>
            <strong style={{ fontSize: 14, color: 'var(--red)' }}>Alerta: Alergias severas registradas</strong>
            <p style={{ fontSize: 13, color: 'var(--red)', opacity: 0.85, marginTop: 2 }}>
              {severalAllergies.map((a) => a.nombre).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Consultas', value: history.length, icon: '📋', color: 'var(--accent)' },
          { label: 'Exámenes', value: exams.length, icon: '🔬', color: 'var(--blue)' },
          { label: 'Medicamentos activos', value: activeMeds.length, icon: '💊', color: 'var(--purple)' },
          { label: 'Alergias', value: allergies.length, icon: '⚠', color: 'var(--amber)' },
        ].map((stat) => (
          <Card key={stat.label} style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)' }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 18 }}>{stat.icon}</span>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</span>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Vital signs */}
          <Card>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 400, marginBottom: 16 }}>Signos vitales</h3>
            {loadingPatient ? <Skeleton height={60} /> : vitals ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {[
                  { key: 'peso', label: 'Peso', value: vitals.peso, unit: 'kg' },
                  { key: 'altura', label: 'Altura', value: vitals.altura, unit: 'm' },
                  { key: 'presion_arterial', label: 'Presión arterial', value: vitals.presion_arterial, unit: 'mmHg' },
                  { key: 'frecuencia_cardiaca', label: 'Frec. cardiaca', value: vitals.frecuencia_cardiaca, unit: 'bpm' },
                  { key: 'temperatura', label: 'Temperatura', value: vitals.temperatura, unit: '°C' },
                ].map((v) => {
                  const status = VITAL_STATUS(v.key, v.value as any);
                  return (
                    <div key={v.key} style={{
                      background: status === 'alert' ? 'var(--red2)' : 'var(--surface2)',
                      borderRadius: 8, padding: '10px 12px',
                      border: `1px solid ${status === 'alert' ? '#f5c6c2' : 'transparent'}`,
                    }}>
                      <div style={{ fontSize: 11, color: status === 'alert' ? 'var(--red)' : 'var(--text3)', marginBottom: 4 }}>{v.label}</div>
                      <div style={{ fontWeight: 600, color: status === 'alert' ? 'var(--red)' : 'var(--text)' }}>
                        {v.value != null ? `${v.value} ${v.unit}` : '—'}
                        {status === 'alert' && ' ⚠'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>Sin datos de signos vitales. Actualiza tu perfil.</p>
            )}
          </Card>

          {/* Recent history timeline */}
          <Card>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 400, marginBottom: 16 }}>Últimas consultas</h3>
            {loadingHistory ? <ListSkeleton count={3} /> : recentHistory.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>Sin consultas registradas</p>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 11, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                {recentHistory.map((h) => (
                  <div key={h.id} style={{ display: 'flex', gap: 16, paddingBottom: 20, paddingLeft: 4 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: TIPO_COLOR[h.tipo] || 'var(--text3)',
                      border: '3px solid var(--surface)', marginTop: 2, zIndex: 1,
                    }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{h.especialidad}</span>
                        {tipoBadge(h.tipo)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                        {h.doctor} · {h.institucion}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{fDate(h.fecha)}</div>
                      {h.diagnostico && (
                        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6, background: 'var(--surface2)', padding: '6px 10px', borderRadius: 6 }}>
                          {h.diagnostico}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active meds */}
          <Card>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 400, marginBottom: 14 }}>Medicamentos activos</h3>
            {loadingMeds ? <ListSkeleton count={2} /> : activeMeds.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Ninguno</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeMeds.map((m) => (
                  <div key={m.id} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{m.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                      {m.dosis} · {m.frecuencia}
                    </div>
                    {m.horario && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>🕐 {m.horario}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Allergies */}
          <Card>
            <h3 className="serif" style={{ fontSize: 16, fontWeight: 400, marginBottom: 14 }}>Alergias</h3>
            {loadingAllergies ? <ListSkeleton count={2} /> : allergies.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 13 }}>Ninguna registrada</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allergies.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{a.nombre}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{a.tipo}</span>
                    </div>
                    {severidadBadge(a.severidad)}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Blood type + info */}
          {patient && (
            <Card style={{ background: 'var(--accent2)', border: '1px solid #c0e0d8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                }}>
                  {patient.tipo_sangre || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo de sangre</div>
                  <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--accent3)' }}>{patient.tipo_sangre || 'No registrado'}</div>
                </div>
              </div>
              {patient.perfil?.contacto_emergencia && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #c0e0d8', fontSize: 12, color: 'var(--accent3)' }}>
                  🆘 {patient.perfil.contacto_emergencia}
                  {patient.perfil.telefono_emergencia && ` · ${patient.perfil.telefono_emergencia}`}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

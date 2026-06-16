import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDoctorStore } from '../store/doctor.store';
import { useCountdown } from '../hooks/useCountdown';
import { fDate, extractError } from '../utils/format';
import type { DoctorSnapshot } from '../types/doctor.types';
import { differenceInYears, parseISO, isValid } from 'date-fns';

/**
 * Dashboard médico de solo lectura.
 * El snapshot se carga desde el Zustand store (puesto por DoctorEntryPage tras el verify).
 * Si no hay snapshot (refresh de página), muestra error y redirige a /doctor.
 */
export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { snapshot, expiresAt, clearSnapshot } = useDoctorStore();
  const { minutes, seconds, expired, totalSeconds } = useCountdown(expiresAt);

  // Si no hay snapshot en el store (refresh de página) → volver al login médico
  useEffect(() => {
    if (!snapshot) {
      navigate('/doctor', { replace: true });
    }
  }, [snapshot, navigate]);

  // Cuando expira la cuenta regresiva → limpiar y volver
  useEffect(() => {
    if (expired && expiresAt) {
      clearSnapshot();
      navigate('/doctor');
    }
  }, [expired, expiresAt, clearSnapshot, navigate]);

  const handleLogout = () => {
    clearSnapshot();
    navigate('/doctor');
  };

  if (!snapshot) {
    // Breve flash mientras el useEffect redirige
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text3)' }}>Redirigiendo…</p>
      </div>
    );
  }

  // ── Datos con defensas ───────────────────────────────
  const snap = snapshot;
  const p = snap.paciente;

  const alergias          = snap.alergias          ?? [];
  const medicamentosAct   = snap.medicamentos_activos ?? [];
  const consultas         = snap.ultimas_consultas  ?? [];
  const vacunas           = snap.vacunas            ?? [];
  const severeAllergies   = alergias.filter((a) => a.severidad === 'severa');

  const age = p.fecha_nacimiento && isValid(parseISO(p.fecha_nacimiento))
    ? differenceInYears(new Date(), parseISO(p.fecha_nacimiento))
    : null;

  const imc = p.peso && p.altura
    ? (p.peso / (p.altura * p.altura)).toFixed(1)
    : null;

  const countdownColor =
    totalSeconds < 120 ? 'var(--red)' :
    totalSeconds < 300 ? 'var(--amber)' : '#fff';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <header style={headerStyle}>
        <div style={headerInnerStyle}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={headerLogoStyle}>M</div>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
              Medicore · Vista médica
            </span>
          </div>

          {/* Paciente */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontFamily: 'DM Serif Display, serif', fontSize: 17, fontWeight: 400 }}>
              {p.nombre}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              {age !== null && <span>{age} años</span>}
              {p.tipo_sangre && (
                <span style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 8px', borderRadius: 10, fontWeight: 600 }}>
                  {p.tipo_sangre}
                </span>
              )}
            </div>
          </div>

          {/* Countdown + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Acceso temporal
              </div>
              <div style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: countdownColor, lineHeight: 1.1 }}>
                {minutes}:{seconds}
              </div>
            </div>
            <button onClick={handleLogout} style={logoutBtnStyle}>
              Cerrar
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENT ───────────────────────────────────── */}
      <main style={mainStyle}>

        {/* §1 — ALERTA CRÍTICA */}
        {severeAllergies.length > 0 && (
          <div style={severeAllergyBannerStyle}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>⚠</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>ALERGIA SEVERA</div>
              <div style={{ fontSize: 14 }}>
                {severeAllergies.map((a) => a.nombre).join(' · ')}
              </div>
            </div>
          </div>
        )}

        {/* §2 — DATOS DEL PACIENTE */}
        <Section title="Datos del paciente" icon="👤">
          <div style={patientGridStyle}>
            <DataCell label="Nombre completo" value={p.nombre} />
            <DataCell
              label="Fecha de nacimiento"
              value={fDate(p.fecha_nacimiento)}
              sub={age !== null ? `${age} años` : undefined}
            />
            <DataCell label="Tipo de sangre" value={p.tipo_sangre ?? '—'} accent />
            {p.contacto_emergencia && (
              <DataCell
                label="Contacto emergencia"
                value={p.contacto_emergencia}
                sub={p.telefono_emergencia}
              />
            )}
          </div>
        </Section>

        {/* §3 — SIGNOS VITALES */}
        <Section title="Signos vitales" icon="💓">
          {(p.peso ?? p.altura ?? p.presion_arterial ?? p.frecuencia_cardiaca ?? p.temperatura) != null ? (
            <>
              <div style={vitalsGridStyle}>
                <VitalCell
                  label="Presión arterial"
                  value={p.presion_arterial}
                  unit="mmHg"
                />
                <VitalCell
                  label="Frec. cardiaca"
                  value={p.frecuencia_cardiaca}
                  unit="bpm"
                  alert={p.frecuencia_cardiaca != null && (p.frecuencia_cardiaca > 100 || p.frecuencia_cardiaca < 60)}
                />
                <VitalCell
                  label="Temperatura"
                  value={p.temperatura}
                  unit="°C"
                  alert={p.temperatura != null && (p.temperatura > 37.5 || p.temperatura < 36)}
                />
                <VitalCell label="Peso" value={p.peso} unit="kg" />
                <VitalCell label="Altura" value={p.altura} unit="m" />
                <VitalCell
                  label="IMC"
                  value={imc}
                  unit=""
                  alert={imc != null && imcAlert(parseFloat(imc))}
                  sub={imc ? imcLabel(parseFloat(imc)) : undefined}
                />
              </div>
              {snap.generado_en && (
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
                  Datos al {fDate(snap.generado_en)}
                </p>
              )}
            </>
          ) : (
            <Empty text="Sin datos de signos vitales registrados" />
          )}
        </Section>

        {/* §4 — MEDICAMENTOS ACTIVOS */}
        <Section title="Medicamentos activos" icon="💊">
          {medicamentosAct.length === 0 ? (
            <Empty text="Sin medicamentos activos registrados" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {medicamentosAct.map((m) => (
                <div key={m.id} style={medRowStyle}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{m.nombre}</span>
                    <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text2)' }}>
                      {m.dosis} · {m.frecuencia}
                    </span>
                    {m.horario && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)' }}>
                        🕐 {m.horario}
                      </span>
                    )}
                    {m.medico_recetante && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        Recetado por: {m.medico_recetante}
                      </div>
                    )}
                  </div>
                  <span style={activeBadgeStyle}>Activo</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* §5 — ALERGIAS */}
        <Section title="Alergias" icon="⚠">
          {alergias.length === 0 ? (
            <Empty text="Sin alergias registradas" />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {alergias.map((a) => (
                <div key={a.id} style={allergyChipStyle(a.severidad)}>
                  <span style={{ fontWeight: 600 }}>{a.nombre}</span>
                  <span style={{ opacity: 0.75, fontSize: 11 }}>
                    {a.tipo} · {a.severidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* §6 — HISTORIAL (últimas 5) */}
        <Section title="Historial de consultas" icon="📋" sub="Últimas 5">
          {consultas.length === 0 ? (
            <Empty text="Sin consultas registradas" />
          ) : (
            <div style={{ position: 'relative', paddingLeft: 16 }}>
              <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
              {consultas.map((h) => (
                <div key={h.id} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    background: TIPO_COLOR[h.tipo] ?? 'var(--text3)',
                    border: '2px solid var(--bg)', marginTop: 3, zIndex: 1,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{h.especialidad}</span>
                      <span style={tipoBadgeStyle(h.tipo)}>
                        {TIPO_LABEL[h.tipo] ?? h.tipo}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {h.doctor}{h.institucion ? ` · ${h.institucion}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fDate(h.fecha)}</div>
                    {h.diagnostico && (
                      <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6, fontSize: 13 }}>
                        {h.diagnostico}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* §7 — VACUNAS */}
        <Section title="Vacunas" icon="💉">
          {vacunas.length === 0 ? (
            <Empty text="Sin vacunas registradas" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {vacunas.map((v) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{v.nombre}</span>
                    {v.lote && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)' }}>
                        Lote: {v.lote}
                      </span>
                    )}
                    {v.institucion && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)' }}>
                        {v.institucion}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0, marginLeft: 8 }}>
                    {fDate(v.fecha)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── FOOTER ──────────────────────────────────── */}
        <footer style={footerStyle}>
          <span>Vista de solo lectura · Acceso autorizado por el paciente · Medicore</span>
          {snap.generado_en && (
            <span>Acceso generado: {fDate(snap.generado_en)}</span>
          )}
        </footer>

        <style>{`
          @media print {
            header, button { display: none !important; }
            main { padding: 0 !important; }
            body { background: white !important; }
          }
        `}</style>
      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function Section({ title, icon, sub, children }: {
  title: string; icon: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div style={sectionStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 16, fontWeight: 400 }}>
          {title}
        </h2>
        {sub && (
          <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>{sub}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function DataCell({ label, value, sub, accent }: {
  label: string; value?: string | null; sub?: string | null; accent?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: accent ? 18 : 14, color: accent ? 'var(--accent)' : 'var(--text)' }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text2)' }}>{sub}</div>}
    </div>
  );
}

function VitalCell({ label, value, unit, alert, sub }: {
  label: string;
  value?: number | string | null;
  unit: string;
  alert?: boolean;
  sub?: string;
}) {
  return (
    <div style={{
      background: alert ? 'var(--amber2)' : 'var(--surface2)',
      border: `1px solid ${alert ? '#e8c98d' : 'transparent'}`,
      borderRadius: 8, padding: '10px 12px',
    }}>
      <div style={{ fontSize: 11, color: alert ? 'var(--amber)' : 'var(--text3)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, color: alert ? 'var(--amber)' : 'var(--text)' }}>
        {value != null ? `${value}${unit ? ' ' + unit : ''}` : '—'}
        {alert && ' ⚠'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p style={{ color: 'var(--text3)', fontSize: 13, fontStyle: 'italic' }}>{text}</p>
  );
}

/* ── Helpers ────────────────────────────────────────── */

function imcAlert(imc: number): boolean {
  return imc < 18.5 || imc > 29.9;
}

function imcLabel(imc: number): string {
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25)   return 'Normal';
  if (imc < 30)   return 'Sobrepeso';
  return 'Obesidad';
}

const TIPO_COLOR: Record<string, string> = {
  control:     'var(--accent)',
  urgencia:    'var(--red)',
  especialidad:'var(--blue)',
  preventivo:  'var(--purple)',
};

const TIPO_LABEL: Record<string, string> = {
  control: 'Control', urgencia: 'Urgencia',
  especialidad: 'Especialidad', preventivo: 'Preventivo',
};

/* ── Styles ─────────────────────────────────────────── */

const headerStyle: React.CSSProperties = {
  background: 'var(--accent)',
  borderBottom: '1px solid var(--accent3)',
  position: 'sticky', top: 0, zIndex: 50,
};

const headerInnerStyle: React.CSSProperties = {
  maxWidth: 760, margin: '0 auto',
  padding: '14px 24px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
};

const headerLogoStyle: React.CSSProperties = {
  width: 28, height: 28,
  background: 'rgba(255,255,255,0.2)',
  borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'DM Serif Display, serif',
  color: '#fff', fontSize: 15,
};

const mainStyle: React.CSSProperties = {
  maxWidth: 760, margin: '0 auto',
  padding: '28px 24px 48px',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const severeAllergyBannerStyle: React.CSSProperties = {
  background: 'var(--red)',
  color: '#fff',
  borderRadius: 10,
  padding: '16px 20px',
  display: 'flex', alignItems: 'flex-start', gap: 14,
  marginBottom: 8,
};

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12, padding: '18px 20px',
  marginBottom: 12,
};

const patientGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 16,
};

const vitalsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
  gap: 10,
};

const medRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10,
  padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8,
};

const activeBadgeStyle: React.CSSProperties = {
  flexShrink: 0,
  background: 'var(--accent2)', color: 'var(--accent)',
  fontSize: 11, fontWeight: 600,
  padding: '3px 8px', borderRadius: 20,
};

function allergyChipStyle(severidad: string): React.CSSProperties {
  const map: Record<string, { bg: string; color: string }> = {
    severa:   { bg: 'var(--red2)',   color: 'var(--red)' },
    moderada: { bg: 'var(--amber2)', color: 'var(--amber)' },
    leve:     { bg: 'var(--blue2)',  color: 'var(--blue)' },
  };
  const { bg, color } = map[severidad] ?? { bg: 'var(--surface2)', color: 'var(--text2)' };
  return {
    display: 'inline-flex', flexDirection: 'column', gap: 1,
    background: bg, color,
    padding: '5px 12px', borderRadius: 20, fontSize: 13,
  };
}

function tipoBadgeStyle(tipo: string): React.CSSProperties {
  const bgMap: Record<string, string> = {
    control: 'var(--accent2)', urgencia: 'var(--red2)',
    especialidad: 'var(--blue2)', preventivo: 'var(--purple2)',
  };
  const colorMap: Record<string, string> = {
    control: 'var(--accent)', urgencia: 'var(--red)',
    especialidad: 'var(--blue)', preventivo: 'var(--purple)',
  };
  return {
    background: bgMap[tipo] ?? 'var(--surface2)',
    color: colorMap[tipo] ?? 'var(--text2)',
    fontSize: 11, fontWeight: 500,
    padding: '2px 8px', borderRadius: 20,
  };
}

const footerStyle: React.CSSProperties = {
  marginTop: 16, paddingTop: 16,
  borderTop: '1px solid var(--border)',
  display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
  fontSize: 11, color: 'var(--text3)',
};

const logoutBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  color: '#fff', border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 7, padding: '6px 14px',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
};

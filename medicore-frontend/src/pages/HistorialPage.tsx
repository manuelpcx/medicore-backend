import React, { useState } from 'react';
import { useHistory, useCreateHistory, useUpdateHistory, useDeleteHistory } from '../hooks/useHistory';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { parseISO, isValid, differenceInDays, isPast } from 'date-fns';
import { format as fmtDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { tipoBadge } from '../components/ui/Badge';
import { ListSkeleton } from '../components/ui/Skeleton';
import { fDate } from '../utils/format';
import type { MedicalHistory, TipoConsulta, CreateHistoryDto } from '../types';

// ── Constantes ─────────────────────────────────────────────────────────────
const TIPOS: { value: TipoConsulta; label: string }[] = [
  { value: 'control', label: 'Control' },
  { value: 'urgencia', label: 'Urgencia' },
  { value: 'especialidad', label: 'Especialidad' },
  { value: 'preventivo', label: 'Preventivo' },
];

const TIPOS_PROXIMA = [
  { value: '', label: 'Selecciona tipo…' },
  { value: 'control', label: 'Control' },
  { value: 'especialidad', label: 'Especialidad' },
  { value: 'examen', label: 'Examen' },
];

const TIPO_COLOR: Record<string, string> = {
  control: 'var(--accent)', urgencia: 'var(--red)',
  especialidad: 'var(--blue)', preventivo: 'var(--purple)',
};

// ── Schema ──────────────────────────────────────────────────────────────────
const schema = z.object({
  fecha: z.string().min(1, 'Requerido'),
  especialidad: z.string().min(1, 'Requerido'),
  doctor: z.string().min(1, 'Requerido'),
  institucion: z.string().optional(),
  diagnostico: z.string().optional(),
  notas: z.string().optional(),
  tipo: z.enum(['control', 'urgencia', 'especialidad', 'preventivo']).default('control'),
  proxima_cita: z.string().nullable().optional(),
  tipo_proxima_cita: z.string().nullable().optional(),
  recordatorio_activo: z.boolean().default(true),
});
type Form = z.infer<typeof schema>;

// ── Indicador de próxima cita ───────────────────────────────────────────────
function ProximaCitaBadge({ proxima_cita, tipo_proxima_cita }: {
  proxima_cita?: string | null;
  tipo_proxima_cita?: string | null;
}) {
  if (!proxima_cita) return null;

  const date = parseISO(proxima_cita);
  if (!isValid(date)) return null;

  const diff = differenceInDays(date, new Date());
  const past = isPast(date) && diff < 0;
  const isManana = diff === 0 || diff === 1;
  const fechaLinda = fmtDate(date, "EEEE d 'de' MMMM", { locale: es });

  let bg = 'var(--blue2)';
  let color = 'var(--blue)';
  let label = `📅 Próximo ${tipo_proxima_cita ?? 'control'}: ${fechaLinda.charAt(0).toUpperCase() + fechaLinda.slice(1)}`;
  let extra = '';

  if (past) {
    bg = 'var(--surface2)';
    color = 'var(--text3)';
    label = `📅 ${tipo_proxima_cita ?? 'Control'}: ${fechaLinda.charAt(0).toUpperCase() + fechaLinda.slice(1)}`;
    extra = ' (pasado)';
  } else if (isManana) {
    bg = 'var(--amber2)';
    color = 'var(--amber)';
    extra = ' — ¡Mañana!';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color,
      fontSize: 12, fontWeight: 500,
      padding: '3px 10px', borderRadius: 20,
      textDecoration: past ? 'line-through' : 'none',
    }}>
      {label}{extra}
    </span>
  );
}

// ── Formulario ──────────────────────────────────────────────────────────────
function HistoryForm({
  id, onSubmit, register, control, errors,
}: {
  id: string;
  onSubmit: (e: React.FormEvent) => void;
  register: ReturnType<typeof useForm<Form>>['register'];
  control: ReturnType<typeof useForm<Form>>['control'];
  errors: ReturnType<typeof useForm<Form>>['formState']['errors'];
}) {

  return (
    <form id={id} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Campos base */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Fecha" type="date" error={errors.fecha?.message} {...register('fecha')} />
        <Select label="Tipo" options={TIPOS} {...register('tipo')} />
      </div>
      <Input label="Especialidad" placeholder="Cardiología"
        error={errors.especialidad?.message} {...register('especialidad')} />
      <Input label="Doctor" placeholder="Dr. García"
        error={errors.doctor?.message} {...register('doctor')} />
      <Input label="Institución" placeholder="Hospital General" {...register('institucion')} />
      <Textarea label="Diagnóstico" rows={3} {...register('diagnostico')} />
      <Textarea label="Notas" rows={2} {...register('notas')} />

      {/* Separador próximo control */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)',
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Próximo control
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Input
            label="¿Cuándo es tu próxima cita?"
            type="date"
            helper="Opcional"
            {...register('proxima_cita')}
          />
          <Select
            label="Tipo de próxima cita"
            options={TIPOS_PROXIMA}
            {...register('tipo_proxima_cita')}
          />
        </div>

      </div>
    </form>
  );
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function HistorialPage() {
  const { data: history = [], isLoading } = useHistory();
  const create = useCreateHistory();
  const update = useUpdateHistory();
  const remove = useDeleteHistory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalHistory | null>(null);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'control', recordatorio_activo: true },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ tipo: 'control', recordatorio_activo: true, proxima_cita: null });
    setModalOpen(true);
  };

  const openEdit = (h: MedicalHistory) => {
    setEditing(h);
    reset({
      ...h,
      fecha: h.fecha?.slice(0, 10),
      proxima_cita: h.proxima_cita ? String(h.proxima_cita).slice(0, 10) : null,
      tipo_proxima_cita: h.tipo_proxima_cita ?? '',
      recordatorio_activo: h.recordatorio_activo ?? true,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: Form) => {
    const payload: Partial<CreateHistoryDto> = {
      ...values,
      proxima_cita: values.proxima_cita || null,
      tipo_proxima_cita: values.tipo_proxima_cita || null,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, dto: payload });
    } else {
      await create.mutateAsync(payload as CreateHistoryDto);
    }
    setModalOpen(false);
  };

  const filtered = history.filter((h) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      h.doctor?.toLowerCase().includes(q) ||
      h.institucion?.toLowerCase().includes(q) ||
      h.especialidad?.toLowerCase().includes(q);
    const matchTipo = !filterTipo || h.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>Historial clínico</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>
            {history.length} consulta{history.length !== 1 ? 's' : ''} registrada{history.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate}>+ Nueva consulta</Button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por doctor, institución…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8,
            border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 14, outline: 'none' }}
        />
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
            background: 'var(--surface)', fontSize: 14, cursor: 'pointer' }}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <ListSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ color: 'var(--text2)' }}>No hay consultas que mostrar</p>
        </Card>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          {filtered.map((h) => (
            <div key={h.id} style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: TIPO_COLOR[h.tipo] || 'var(--text3)',
                border: '3px solid var(--bg)', marginTop: 16, zIndex: 1,
              }} />
              <Card style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{h.especialidad}</span>
                      {tipoBadge(h.tipo)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {h.doctor}{h.institucion && ` · ${h.institucion}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{fDate(h.fecha)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(h)}>Editar</Button>
                    <Button variant="danger" size="sm" onClick={() => setConfirmDelete(h.id)}>Eliminar</Button>
                  </div>
                </div>

                {h.diagnostico && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
                    <strong>Diagnóstico:</strong> {h.diagnostico}
                  </div>
                )}
                {h.notas && (
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text2)', fontStyle: 'italic' }}>
                    {h.notas}
                  </div>
                )}

                {/* Indicador de próxima cita */}
                {h.proxima_cita && (
                  <div style={{ marginTop: 10 }}>
                    <ProximaCitaBadge
                      proxima_cita={String(h.proxima_cita)}
                      tipo_proxima_cita={h.tipo_proxima_cita}
                    />
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar consulta' : 'Nueva consulta'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="history-form" type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Guardar cambios' : 'Crear consulta'}
            </Button>
          </>
        }
      >
        <HistoryForm
          id="history-form"
          onSubmit={handleSubmit(onSubmit)}
          register={register}
          control={control}
          errors={errors}
        />
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        title="Confirmar eliminación" maxWidth={380}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" loading={remove.isPending} onClick={async () => {
              await remove.mutateAsync(confirmDelete!);
              setConfirmDelete(null);
            }}>Eliminar</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          ¿Estás seguro de que quieres eliminar esta consulta? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}

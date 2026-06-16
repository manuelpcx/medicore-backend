import React, { useState } from 'react';
import { useMedications, useCreateMedication, useUpdateMedication, useDeleteMedication } from '../hooks/useMedications';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Toggle } from '../components/ui/Toggle';
import { ListSkeleton } from '../components/ui/Skeleton';
import { fDate } from '../utils/format';
import type { Medication } from '../types';

// ── Schema con campos de notificación ──────────────────────────────────────
const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  dosis: z.string().min(1, 'Requerido'),
  frecuencia: z.string().min(1, 'Requerido'),
  horario: z.string().optional(),
  estado: z.enum(['activo', 'finalizado']).default('activo'),
  medico_recetante: z.string().optional(),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  notificacion_activa: z.boolean().default(true),
  horario_notificacion: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (
    data.notificacion_activa &&
    data.estado === 'activo' &&
    (!data.horario_notificacion || data.horario_notificacion.trim() === '')
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ingresa la hora del recordatorio (HH:MM)',
      path: ['horario_notificacion'],
    });
  }
});
type Form = z.infer<typeof schema>;

// ── Chip de notificación ───────────────────────────────────────────────────
function NotifChip({ med }: { med: Medication }) {
  if (!med.notificacion_activa) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: 'var(--surface2)', color: 'var(--text3)',
        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      }}>
        🔕 Sin recordatorio
      </span>
    );
  }
  if (med.horario_notificacion) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: 'var(--accent2)', color: 'var(--accent3)',
        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
      }}>
        🔔 {med.horario_notificacion}
      </span>
    );
  }
  return null;
}

// ── Tarjeta de medicamento ─────────────────────────────────────────────────
function MedCard({ med, onEdit, onDelete, onToggle }: {
  med: Medication;
  onEdit: (m: Medication) => void;
  onDelete: (id: string) => void;
  onToggle: (m: Medication) => void;
}) {
  const isActive = med.estado === 'activo';
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>💊</span>
            <span style={{ fontWeight: 600, fontSize: 15 }}>{med.nombre}</span>
            <Badge variant={isActive ? 'success' : 'default'}>
              {isActive ? 'Activo' : 'Finalizado'}
            </Badge>
            {isActive && <NotifChip med={med} />}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span>💉 {med.dosis}</span>
            <span>🔄 {med.frecuencia}</span>
            {med.horario && <span>🕐 {med.horario}</span>}
          </div>
          {med.medico_recetante && (
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              👨‍⚕️ {med.medico_recetante}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 10 }}>
            {med.fecha_inicio && <span>Inicio: {fDate(med.fecha_inicio)}</span>}
            {med.fecha_fin && <span>Fin: {fDate(med.fecha_fin)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => onEdit(med)}>Editar</Button>
          <Button size="sm" variant="secondary" onClick={() => onToggle(med)}>
            {isActive ? 'Finalizar' : 'Reactivar'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(med.id)}>Eliminar</Button>
        </div>
      </div>
    </Card>
  );
}

// ── Formulario (modal) ─────────────────────────────────────────────────────
function MedForm({ id, onSubmit, register, control, errors }: {
  id: string;
  onSubmit: (e: React.FormEvent) => void;
  register: ReturnType<typeof useForm<Form>>['register'];
  control: ReturnType<typeof useForm<Form>>['control'];
  errors: ReturnType<typeof useForm<Form>>['formState']['errors'];
}) {
  // Observar notificacion_activa y estado para mostrar/ocultar el campo de hora
  const notifActiva = useWatch({ control, name: 'notificacion_activa', defaultValue: true });
  const estado = useWatch({ control, name: 'estado', defaultValue: 'activo' });
  const showHora = notifActiva && estado === 'activo';

  return (
    <form id={id} onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Campos base */}
      <Input label="Nombre del medicamento" placeholder="Metformina"
        error={errors.nombre?.message} {...register('nombre')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Dosis" placeholder="500mg" error={errors.dosis?.message} {...register('dosis')} />
        <Input label="Frecuencia" placeholder="Cada 12 horas"
          error={errors.frecuencia?.message} {...register('frecuencia')} />
      </div>
      <Input label="Horario descriptivo" placeholder="Mañana y noche" {...register('horario')} />
      <Input label="Médico recetante" placeholder="Dr. López" {...register('medico_recetante')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Fecha inicio" type="date" {...register('fecha_inicio')} />
        <Input label="Fecha fin" type="date" {...register('fecha_fin')} />
      </div>
      <Select
        label="Estado"
        options={[{ value: 'activo', label: 'Activo' }, { value: 'finalizado', label: 'Finalizado' }]}
        {...register('estado')}
      />

      {/* Separador de notificaciones */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: 0.5, marginBottom: 12 }}>
          Recordatorio por email
        </p>

        {/* Toggle activar recordatorio */}
        <NotifToggleField control={control} register={register} name="notificacion_activa" />

        {/* Input hora — visible sólo si está activo y estado=activo */}
        {showHora && (
          <div style={{ marginTop: 12 }}>
            <Input
              label="¿A qué hora tomar este medicamento?"
              type="time"
              helper="Te enviaremos un email a esta hora como recordatorio"
              error={errors.horario_notificacion?.message}
              {...register('horario_notificacion')}
            />
          </div>
        )}
      </div>
    </form>
  );
}

/**
 * Toggle gestionado con react-hook-form para notificacion_activa.
 * Necesita control para getValue y register para onChange.
 */
function NotifToggleField({
  control, register, name,
}: {
  control: ReturnType<typeof useForm<Form>>['control'];
  register: ReturnType<typeof useForm<Form>>['register'];
  name: 'notificacion_activa';
}) {
  const value = useWatch({ control, name, defaultValue: true });
  const { onChange } = register(name);

  return (
    <Toggle
      checked={!!value}
      onChange={(v) => onChange({ target: { value: v, name } })}
      label="Activar recordatorio para este medicamento"
      description="Recibirás un aviso por email a la hora configurada"
    />
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function MedicamentosPage() {
  const { data: medications = [], isLoading } = useMedications();
  const create = useCreateMedication();
  const update = useUpdateMedication();
  const remove = useDeleteMedication();

  const [tab, setTab] = useState<'activo' | 'finalizado'>('activo');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { estado: 'activo', notificacion_activa: true },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ estado: 'activo', notificacion_activa: true, horario_notificacion: null });
    setModalOpen(true);
  };

  const openEdit = (m: Medication) => {
    setEditing(m);
    reset({
      ...m,
      fecha_inicio: m.fecha_inicio?.slice(0, 10),
      fecha_fin: m.fecha_fin?.slice(0, 10),
      notificacion_activa: m.notificacion_activa ?? true,
      horario_notificacion: m.horario_notificacion ?? null,
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: Form) => {
    const payload = {
      ...values,
      // Si el toggle está desactivado, limpiar la hora
      horario_notificacion: values.notificacion_activa ? (values.horario_notificacion ?? null) : null,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, dto: payload });
    } else {
      await create.mutateAsync(payload);
    }
    setModalOpen(false);
  };

  const handleToggle = async (m: Medication) => {
    await update.mutateAsync({
      id: m.id,
      dto: { estado: m.estado === 'activo' ? 'finalizado' : 'activo' },
    });
  };

  const filtered = medications.filter((m) => m.estado === tab);

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>Medicamentos</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>
            {medications.filter((m) => m.estado === 'activo').length} activos
          </p>
        </div>
        <Button onClick={openCreate}>+ Agregar</Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
        {(['activo', 'finalizado'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === t ? 'var(--accent)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--text2)',
            fontWeight: 500, fontSize: 14, fontFamily: 'inherit', transition: 'all 0.12s',
          }}>
            {t === 'activo' ? 'Activos' : 'Anteriores'} ({medications.filter((m) => m.estado === t).length})
          </button>
        ))}
      </div>

      {isLoading ? <ListSkeleton count={3} /> : filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💊</div>
          <p style={{ color: 'var(--text2)' }}>
            {tab === 'activo' ? 'No hay medicamentos activos' : 'No hay medicamentos anteriores'}
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((m) => (
            <MedCard key={m.id} med={m} onEdit={openEdit} onDelete={setConfirmDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar medicamento' : 'Agregar medicamento'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="med-form" type="submit" loading={create.isPending || update.isPending}>
              {editing ? 'Guardar' : 'Agregar'}
            </Button>
          </>
        }
      >
        <MedForm
          id="med-form"
          onSubmit={handleSubmit(onSubmit)}
          register={register}
          control={control}
          errors={errors}
        />
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        title="Eliminar medicamento" maxWidth={380}
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
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>¿Eliminar este medicamento?</p>
      </Modal>
    </div>
  );
}

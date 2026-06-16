import React, { useState } from 'react';
import { useVaccines, useCreateVaccine, useDeleteVaccine } from '../hooks/useVaccines';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ListSkeleton } from '../components/ui/Skeleton';
import { fDate, isSoonDate, daysUntil } from '../utils/format';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  fecha: z.string().min(1, 'Requerido'),
  lote: z.string().optional(),
  institucion: z.string().optional(),
  proxima_dosis: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function VacunasPage() {
  const { data: vaccines = [], isLoading } = useVaccines();
  const create = useCreateVaccine();
  const remove = useDeleteVaccine();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: Form) => {
    await create.mutateAsync(values);
    setModalOpen(false);
    reset();
  };

  const soonVaccines = vaccines.filter((v) => isSoonDate(v.proxima_dosis, 30));

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>Vacunas</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>{vaccines.length} registrada{vaccines.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true); }}>+ Agregar</Button>
      </div>

      {soonVaccines.length > 0 && (
        <div style={{ background: 'var(--amber2)', border: '1px solid #e8c98d', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          ⏰ <strong style={{ color: 'var(--amber)' }}>Próximas dosis en los siguientes 30 días:</strong>
          {' '}{soonVaccines.map((v) => `${v.nombre} (${daysUntil(v.proxima_dosis)} días)`).join(', ')}
        </div>
      )}

      {isLoading ? <ListSkeleton count={3} /> : vaccines.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💉</div>
          <p style={{ color: 'var(--text2)' }}>Sin vacunas registradas</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {vaccines.map((v) => {
            const soon = isSoonDate(v.proxima_dosis, 30);
            return (
              <Card key={v.id} style={{ borderColor: soon ? '#e8c98d' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>💉</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{v.nombre}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>📅 Aplicada: {fDate(v.fecha)}</span>
                      {v.lote && <span>🔖 Lote: {v.lote}</span>}
                      {v.institucion && <span>🏥 {v.institucion}</span>}
                      {v.proxima_dosis && (
                        <span style={{ color: soon ? 'var(--amber)' : undefined, fontWeight: soon ? 500 : 400 }}>
                          {soon && '⚠ '}Próxima dosis: {fDate(v.proxima_dosis)}
                          {soon && ` (en ${daysUntil(v.proxima_dosis)} días)`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(v.id)}>✕</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar vacuna"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="vaccine-form" type="submit" loading={create.isPending}>Registrar</Button>
          </>
        }
      >
        <form id="vaccine-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre de la vacuna" placeholder="COVID-19 Pfizer" error={errors.nombre?.message} {...register('nombre')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Fecha de aplicación" type="date" error={errors.fecha?.message} {...register('fecha')} />
            <Input label="Lote" placeholder="AB1234" {...register('lote')} />
          </div>
          <Input label="Institución" placeholder="IMSS" {...register('institucion')} />
          <Input label="Próxima dosis" type="date" helper="Déjalo en blanco si es dosis única" {...register('proxima_dosis')} />
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar vacuna" maxWidth={380}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" loading={remove.isPending} onClick={async () => {
              await remove.mutateAsync(confirmDelete!); setConfirmDelete(null);
            }}>Eliminar</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>¿Eliminar este registro de vacunación?</p>
      </Modal>
    </div>
  );
}

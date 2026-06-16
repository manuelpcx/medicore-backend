import React, { useState } from 'react';
import { useAllergies, useCreateAllergy, useDeleteAllergy } from '../hooks/useAllergies';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { severidadBadge } from '../components/ui/Badge';
import { ListSkeleton } from '../components/ui/Skeleton';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  severidad: z.enum(['leve', 'moderada', 'severa']),
  tipo: z.enum(['medicamento', 'alimentaria', 'ambiental', 'otra']).default('otra'),
});
type Form = z.infer<typeof schema>;

const TIPO_ICON: Record<string, string> = {
  medicamento: '💊', alimentaria: '🍽️', ambiental: '🌿', otra: '⚠',
};

export default function AlergiasPage() {
  const { data: allergies = [], isLoading } = useAllergies();
  const create = useCreateAllergy();
  const remove = useDeleteAllergy();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'otra', severidad: 'leve' },
  });

  const onSubmit = async (values: Form) => {
    await create.mutateAsync(values);
    setModalOpen(false);
    reset();
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>Alergias</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>{allergies.length} registrada{allergies.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { reset(); setModalOpen(true); }}>+ Agregar</Button>
      </div>

      {allergies.filter((a) => a.severidad === 'severa').length > 0 && (
        <div style={{ background: 'var(--red2)', border: '1px solid #f5c6c2', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          🚨 <strong>Alerta severa:</strong> {allergies.filter((a) => a.severidad === 'severa').map((a) => a.nombre).join(', ')}
        </div>
      )}

      {isLoading ? <ListSkeleton count={3} /> : allergies.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ color: 'var(--text2)' }}>Sin alergias registradas</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {allergies.map((a) => (
            <Card key={a.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{TIPO_ICON[a.tipo] ?? '⚠'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, textTransform: 'capitalize' }}>{a.tipo}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {severidadBadge(a.severidad)}
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(a.id)}>✕</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar alergia"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="allergy-form" type="submit" loading={create.isPending}>Registrar</Button>
          </>
        }
      >
        <form id="allergy-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre de la alergia" placeholder="Penicilina" error={errors.nombre?.message} {...register('nombre')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Severidad" options={[
              { value: 'leve', label: 'Leve' },
              { value: 'moderada', label: 'Moderada' },
              { value: 'severa', label: 'Severa' },
            ]} {...register('severidad')} />
            <Select label="Tipo" options={[
              { value: 'medicamento', label: 'Medicamento' },
              { value: 'alimentaria', label: 'Alimentaria' },
              { value: 'ambiental', label: 'Ambiental' },
              { value: 'otra', label: 'Otra' },
            ]} {...register('tipo')} />
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar alergia" maxWidth={380}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" loading={remove.isPending} onClick={async () => {
              await remove.mutateAsync(confirmDelete!); setConfirmDelete(null);
            }}>Eliminar</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>¿Eliminar esta alergia de tu perfil?</p>
      </Modal>
    </div>
  );
}

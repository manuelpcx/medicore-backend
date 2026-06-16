import React, { useState } from 'react';
import { useExams, useCreateExam, useDeleteExam } from '../hooks/useExams';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FileUpload } from '../components/ui/FileUpload';
import { resultadoBadge } from '../components/ui/Badge';
import { ListSkeleton } from '../components/ui/Skeleton';
import { fDate } from '../utils/format';
import { examsApi } from '../api/exams.api';
import { useAuthStore } from '../store/auth.store';
import type { Exam } from '../types';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  fecha: z.string().min(1, 'Requerido'),
  laboratorio: z.string().optional(),
  tipo: z.string().optional(),
  resultado_badge: z.enum(['normal', 'alterado', 'pendiente']).default('pendiente'),
});
type Form = z.infer<typeof schema>;

export default function ExamenesPage() {
  const { data: exams = [], isLoading } = useExams();
  const create = useCreateExam();
  const remove = useDeleteExam();

  const [modalOpen, setModalOpen] = useState(false);
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { resultado_badge: 'pendiente' },
  });

  const openCreate = () => { reset({ resultado_badge: 'pendiente' }); setFile(null); setModalOpen(true); };

  const onSubmit = async (values: Form) => {
    await create.mutateAsync({ dto: values, file: file ?? undefined });
    setModalOpen(false);
  };

  const getFileUrl = (id: string) => {
    const base = examsApi.getFileUrl(id);
    return `${base}?token=${accessToken}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400 }}>Exámenes</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>{exams.length} examen{exams.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button onClick={openCreate}>+ Subir examen</Button>
      </div>

      {isLoading ? <ListSkeleton count={3} /> : exams.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔬</div>
          <p style={{ color: 'var(--text2)' }}>No hay exámenes registrados</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {exams.map((exam) => (
            <Card key={exam.id} hoverable>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>
                      {exam.archivo_mimetype === 'application/pdf' ? '📄' : exam.archivo_path ? '🖼️' : '🔬'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exam.nombre}
                    </span>
                  </div>
                  {resultadoBadge(exam.resultado_badge)}
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                    {fDate(exam.fecha)}
                    {exam.laboratorio && ` · ${exam.laboratorio}`}
                  </div>
                  {exam.tipo && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{exam.tipo}</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {exam.archivo_path && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setPreviewExam(exam)}>
                      Ver
                    </Button>
                    <a
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/exams/${exam.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="ghost">Descargar</Button>
                    </a>
                  </>
                )}
                <Button size="sm" variant="danger" onClick={() => setConfirmDelete(exam.id)} style={{ marginLeft: 'auto' }}>
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Subir examen"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="exam-form" type="submit" loading={create.isPending}>Subir</Button>
          </>
        }
      >
        <form id="exam-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre del examen" placeholder="Hemograma completo" error={errors.nombre?.message} {...register('nombre')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Fecha" type="date" error={errors.fecha?.message} {...register('fecha')} />
            <Select
              label="Resultado"
              options={[
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'normal', label: 'Normal' },
                { value: 'alterado', label: 'Alterado' },
              ]}
              {...register('resultado_badge')}
            />
          </div>
          <Input label="Laboratorio" placeholder="Laboratorio Central" {...register('laboratorio')} />
          <Input label="Tipo de examen" placeholder="Sangre, Imagen, Orina…" {...register('tipo')} />
          <FileUpload
            label="Archivo (PDF o imagen)"
            value={file}
            onChange={setFile}
          />
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!previewExam} onClose={() => setPreviewExam(null)} title={previewExam?.nombre} maxWidth={700}
        footer={<Button variant="ghost" onClick={() => setPreviewExam(null)}>Cerrar</Button>}
      >
        {previewExam && (
          <div style={{ textAlign: 'center' }}>
            {previewExam.archivo_mimetype === 'application/pdf' ? (
              <iframe
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/exams/${previewExam.id}/file`}
                style={{ width: '100%', height: 500, border: 'none', borderRadius: 8 }}
                title="PDF"
              />
            ) : (
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/exams/${previewExam.id}/file`}
                alt={previewExam.nombre}
                style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 8 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar examen" maxWidth={380}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="danger" loading={remove.isPending} onClick={async () => {
              await remove.mutateAsync(confirmDelete!); setConfirmDelete(null);
            }}>Eliminar</Button>
          </>
        }
      >
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>¿Eliminar este examen? También se eliminará el archivo adjunto.</p>
      </Modal>
    </div>
  );
}

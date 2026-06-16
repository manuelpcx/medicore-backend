import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examsApi } from '../api/exams.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { CreateExamDto } from '../types';

const KEY = ['exams'];

export function useExams() {
  return useQuery({ queryKey: KEY, queryFn: examsApi.getAll });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dto, file }: { dto: CreateExamDto; file?: File }) => examsApi.create(dto, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Examen subido'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Examen eliminado'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

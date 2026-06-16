import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vaccinesApi } from '../api/vaccines.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { CreateVaccineDto } from '../types';

const KEY = ['vaccines'];

export function useVaccines() {
  return useQuery({ queryKey: KEY, queryFn: vaccinesApi.getAll });
}

export function useCreateVaccine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateVaccineDto) => vaccinesApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Vacuna registrada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useDeleteVaccine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vaccinesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Vacuna eliminada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

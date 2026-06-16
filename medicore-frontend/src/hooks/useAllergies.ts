import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { allergiesApi } from '../api/allergies.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { CreateAllergyDto } from '../types';

const KEY = ['allergies'];

export function useAllergies() {
  return useQuery({ queryKey: KEY, queryFn: allergiesApi.getAll });
}

export function useCreateAllergy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAllergyDto) => allergiesApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Alergia registrada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useDeleteAllergy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => allergiesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Alergia eliminada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

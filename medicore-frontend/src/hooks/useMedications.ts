import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationsApi } from '../api/medications.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { CreateMedicationDto } from '../types';

const KEY = ['medications'];

export function useMedications() {
  return useQuery({ queryKey: KEY, queryFn: medicationsApi.getAll });
}

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateMedicationDto) => medicationsApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Medicamento agregado'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useUpdateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateMedicationDto> }) =>
      medicationsApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Medicamento actualizado'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Medicamento eliminado'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

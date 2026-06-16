import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { historyApi } from '../api/history.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { CreateHistoryDto } from '../types';

const KEY = ['history'];

export function useHistory() {
  return useQuery({ queryKey: KEY, queryFn: historyApi.getAll });
}

export function useCreateHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateHistoryDto) => historyApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Consulta guardada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useUpdateHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateHistoryDto> }) => historyApi.update(id, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Consulta actualizada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useDeleteHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => historyApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Consulta eliminada'); },
    onError: (err) => toast.error(extractError(err)),
  });
}

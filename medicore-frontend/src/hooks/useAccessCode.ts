import { useMutation, useQuery } from '@tanstack/react-query';
import { accessCodesApi, verifyAccessCode } from '../api/access-codes.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';

export function useGenerateAccessCode() {
  return useMutation({
    mutationFn: accessCodesApi.generate,
    onError: (err) => toast.error(extractError(err)),
  });
}

export function useRevokeAccessCode() {
  return useMutation({
    mutationFn: accessCodesApi.revoke,
    onSuccess: () => toast.success('Acceso revocado'),
    onError: (err) => toast.error(extractError(err)),
  });
}

/**
 * Carga el snapshot del paciente usando un código temporal.
 * Pública: no requiere JWT. staleTime 0 para no servir datos cacheados.
 */
export function useDoctorSnapshot(code: string) {
  return useQuery({
    queryKey: ['doctor-snapshot', code],
    queryFn: () => verifyAccessCode(code),
    enabled: !!code,
    staleTime: 0,
    retry: false,
    gcTime: 0,        // no mantener en caché al desmontar
  });
}

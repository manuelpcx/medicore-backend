import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsApi } from '../api/patients.api';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { UpdatePatientDto } from '../types';

export const PATIENT_KEY = ['patient', 'me'];

export function usePatient() {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: PATIENT_KEY,
    queryFn: patientsApi.getMe,
    enabled: isAuth,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePatientDto) => patientsApi.updateMe(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PATIENT_KEY });
      toast.success('Perfil actualizado');
    },
    onError: (err) => toast.error(extractError(err)),
  });
}

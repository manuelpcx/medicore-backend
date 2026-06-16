import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications.api';
import { toast } from '../store/toast.store';
import { extractError } from '../utils/format';
import type { NotificationPreferences } from '../types';

const KEY = ['notification-preferences'];

export function useNotificationPreferences() {
  return useQuery({
    queryKey: KEY,
    queryFn: notificationsApi.getPreferences,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) =>
      notificationsApi.updatePreferences(prefs),
    onSuccess: (data) => {
      // Actualizar caché sin refetch
      qc.setQueryData(KEY, data);
      toast.success('Preferencias guardadas');
    },
    onError: (err) => toast.error(extractError(err) || 'No se pudo guardar, intenta de nuevo'),
  });
}

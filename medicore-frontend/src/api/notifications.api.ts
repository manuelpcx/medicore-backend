import api from './axios';
import type { NotificationPreferences, ApiResponse } from '../types';

export const notificationsApi = {
  getPreferences: () =>
    api
      .get<ApiResponse<NotificationPreferences>>('/notifications/preferences')
      .then((r) => r.data.data),

  updatePreferences: (prefs: Partial<NotificationPreferences>) =>
    api
      .patch<ApiResponse<NotificationPreferences>>('/notifications/preferences', prefs)
      .then((r) => r.data.data),
};

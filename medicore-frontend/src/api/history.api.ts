import api from './axios';
import type { MedicalHistory, CreateHistoryDto, ApiResponse } from '../types';

export const historyApi = {
  getAll: () =>
    api.get<ApiResponse<MedicalHistory[]>>('/history').then((r) => r.data.data),

  create: (dto: CreateHistoryDto) =>
    api.post<ApiResponse<MedicalHistory>>('/history', dto).then((r) => r.data.data),

  update: (id: string, dto: Partial<CreateHistoryDto>) =>
    api.patch<ApiResponse<MedicalHistory>>(`/history/${id}`, dto).then((r) => r.data.data),

  delete: (id: string) => api.delete(`/history/${id}`),
};

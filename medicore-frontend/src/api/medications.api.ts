import api from './axios';
import type { Medication, CreateMedicationDto, ApiResponse } from '../types';

export const medicationsApi = {
  getAll: () =>
    api.get<ApiResponse<Medication[]>>('/medications').then((r) => r.data.data),

  create: (dto: CreateMedicationDto) =>
    api.post<ApiResponse<Medication>>('/medications', dto).then((r) => r.data.data),

  update: (id: string, dto: Partial<CreateMedicationDto>) =>
    api.patch<ApiResponse<Medication>>(`/medications/${id}`, dto).then((r) => r.data.data),

  delete: (id: string) => api.delete(`/medications/${id}`),
};

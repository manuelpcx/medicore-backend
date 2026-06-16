import api from './axios';
import type { Vaccine, CreateVaccineDto, ApiResponse } from '../types';

export const vaccinesApi = {
  getAll: () =>
    api.get<ApiResponse<Vaccine[]>>('/vaccines').then((r) => r.data.data),

  create: (dto: CreateVaccineDto) =>
    api.post<ApiResponse<Vaccine>>('/vaccines', dto).then((r) => r.data.data),

  delete: (id: string) => api.delete(`/vaccines/${id}`),
};

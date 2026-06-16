import api from './axios';
import type { Allergy, CreateAllergyDto, ApiResponse } from '../types';

export const allergiesApi = {
  getAll: () =>
    api.get<ApiResponse<Allergy[]>>('/allergies').then((r) => r.data.data),

  create: (dto: CreateAllergyDto) =>
    api.post<ApiResponse<Allergy>>('/allergies', dto).then((r) => r.data.data),

  delete: (id: string) => api.delete(`/allergies/${id}`),
};

import api from './axios';
import type { Exam, CreateExamDto, ApiResponse } from '../types';

export const examsApi = {
  getAll: () =>
    api.get<ApiResponse<Exam[]>>('/exams').then((r) => r.data.data),

  create: (dto: CreateExamDto, file?: File) => {
    const form = new FormData();
    Object.entries(dto).forEach(([k, v]) => { if (v !== undefined) form.append(k, String(v)); });
    if (file) form.append('archivo', file);
    return api.post<ApiResponse<Exam>>('/exams', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data);
  },

  delete: (id: string) => api.delete(`/exams/${id}`),

  getFileUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/exams/${id}/file`,
};

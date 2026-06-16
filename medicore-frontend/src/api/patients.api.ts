import api from './axios';
import type { PatientProfile, UpdatePatientDto, ApiResponse } from '../types';

export const patientsApi = {
  getMe: () =>
    api.get<ApiResponse<PatientProfile>>('/patients/me').then((r) => r.data.data),

  updateMe: (dto: UpdatePatientDto) =>
    api.patch<ApiResponse<PatientProfile>>('/patients/me', dto).then((r) => r.data.data),
};

import api from './axios';
import axios from 'axios';
import type { AccessCode, ApiResponse } from '../types';
import type { DoctorSnapshot } from '../types/doctor.types';

export const accessCodesApi = {
  generate: () =>
    api.post<ApiResponse<AccessCode>>('/access-codes/generate').then((r) => r.data.data),

  verify: (code: string) =>
    api.post<ApiResponse<unknown>>('/access-codes/verify', { code }).then((r) => r.data.data),

  revoke: () =>
    api.delete<ApiResponse<{ message: string }>>('/access-codes/revoke').then((r) => r.data.data),
};

/**
 * Llamada pública (sin JWT) — usa axios directamente, no el interceptor autenticado.
 * Devuelve el snapshot completo del paciente para la vista médica.
 */
export async function verifyAccessCode(code: string): Promise<DoctorSnapshot> {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { data } = await axios.post<ApiResponse<DoctorSnapshot>>(
    `${baseURL}/access-codes/verify`,
    { code },
  );
  return data.data;
}

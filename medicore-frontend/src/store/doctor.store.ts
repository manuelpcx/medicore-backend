import { create } from 'zustand';
import type { DoctorSession } from '../types/doctor.types';

/**
 * Estado efímero de la sesión médica.
 * NO usa persist() — se limpia al cerrar/recargar la pestaña intencionalmente.
 */
export const useDoctorStore = create<DoctorSession>((set) => ({
  snapshot: null,
  expiresAt: null,

  setSnapshot: (snapshot, expiresAt) =>
    set({ snapshot, expiresAt }),

  clearSnapshot: () =>
    set({ snapshot: null, expiresAt: null }),
}));

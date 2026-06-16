import type { MedicalHistory, Medication, Allergy, Vaccine } from './index';

/**
 * Shape exacto devuelto por POST /access-codes/verify
 * (ver AccessCodesService.buildSnapshot en el backend)
 *
 * Los signos vitales viven dentro de `paciente` (no hay objeto `perfil` separado).
 * No incluye exámenes (el backend no los expone en el snapshot por privacidad).
 */
export interface DoctorSnapshotPaciente {
  nombre: string;
  email: string;
  fecha_nacimiento?: string;
  tipo_sangre?: string;
  // Signos vitales embebidos en el mismo objeto
  peso?: number;
  altura?: number;
  presion_arterial?: string;
  frecuencia_cardiaca?: number;
  temperatura?: number;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
}

export interface DoctorSnapshot {
  paciente: DoctorSnapshotPaciente;
  alergias: Allergy[];
  medicamentos_activos: Medication[];
  ultimas_consultas: MedicalHistory[];   // últimas 5, campo real del backend
  vacunas: Vaccine[];
  generado_en?: string;                  // campo real del backend
  message?: string;
}

/** Estado local del store médico (no se persiste en localStorage) */
export interface DoctorSession {
  snapshot: DoctorSnapshot | null;
  expiresAt: Date | null;
  setSnapshot: (snapshot: DoctorSnapshot, expiresAt: Date) => void;
  clearSnapshot: () => void;
}

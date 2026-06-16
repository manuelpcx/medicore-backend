export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  fecha_nacimiento?: string;
  tipo_sangre?: string;
  activo: boolean;
  created_at: string;
}

export interface VitalSigns {
  peso?: number;
  altura?: number;
  presion_arterial?: string;
  frecuencia_cardiaca?: number;
  temperatura?: number;
}

export interface Patient extends VitalSigns {
  id: string;
  user_id: string;
  telefono?: string;
  direccion?: string;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
  updated_at: string;
}

export interface PatientProfile extends User {
  perfil: Patient;
}

export type TipoConsulta = 'control' | 'urgencia' | 'especialidad' | 'preventivo';

export interface MedicalHistory {
  id: string;
  patient_id: string;
  fecha: string;
  especialidad: string;
  doctor: string;
  institucion?: string;
  diagnostico?: string;
  notas?: string;
  tipo: TipoConsulta;
  proxima_cita?: string | null;
  tipo_proxima_cita?: string | null;
  recordatorio_activo?: boolean;
  created_at: string;
  updated_at: string;
}

export type EstadoMedicamento = 'activo' | 'finalizado';

export interface Medication {
  id: string;
  patient_id: string;
  nombre: string;
  dosis: string;
  frecuencia: string;
  horario?: string;
  estado: EstadoMedicamento;
  medico_recetante?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  horario_notificacion?: string | null;
  notificacion_activa: boolean;
  created_at: string;
  updated_at: string;
}

export type ResultadoBadge = 'normal' | 'alterado' | 'pendiente';

export interface Exam {
  id: string;
  patient_id: string;
  nombre: string;
  fecha: string;
  laboratorio?: string;
  tipo?: string;
  resultado_badge: ResultadoBadge;
  archivo_path?: string;
  archivo_nombre?: string;
  archivo_mimetype?: string;
  created_at: string;
}

export type SeveridadAlergia = 'leve' | 'moderada' | 'severa';
export type TipoAlergia = 'medicamento' | 'alimentaria' | 'ambiental' | 'otra';

export interface Allergy {
  id: string;
  patient_id: string;
  nombre: string;
  severidad: SeveridadAlergia;
  tipo: TipoAlergia;
  created_at: string;
}

export interface Vaccine {
  id: string;
  patient_id: string;
  nombre: string;
  fecha: string;
  lote?: string;
  institucion?: string;
  proxima_dosis?: string;
  created_at: string;
}

export interface AccessCode {
  id: string;
  code: string;
  expires_at: string;
  message: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
  message: string;
}

// Form DTOs
export interface RegisterDto {
  nombre: string;
  email: string;
  password: string;
  fecha_nacimiento?: string;
  tipo_sangre?: string;
  /** Consentimiento explícito — debe ser true. Requerido por Ley 19.628 / Ley 21.719. */
  consent_accepted: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateHistoryDto {
  fecha: string;
  especialidad: string;
  doctor: string;
  institucion?: string;
  diagnostico?: string;
  notas?: string;
  tipo?: TipoConsulta;
  proxima_cita?: string | null;
  tipo_proxima_cita?: string | null;
  recordatorio_activo?: boolean;
}

export interface CreateMedicationDto {
  nombre: string;
  dosis: string;
  frecuencia: string;
  horario?: string;
  estado?: EstadoMedicamento;
  medico_recetante?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  horario_notificacion?: string | null;
  notificacion_activa?: boolean;
}

export interface CreateAllergyDto {
  nombre: string;
  severidad: SeveridadAlergia;
  tipo?: TipoAlergia;
}

export interface CreateVaccineDto {
  nombre: string;
  fecha: string;
  lote?: string;
  institucion?: string;
  proxima_dosis?: string;
}

export interface CreateExamDto {
  nombre: string;
  fecha: string;
  laboratorio?: string;
  tipo?: string;
  resultado_badge?: ResultadoBadge;
}

export interface UpdatePatientDto extends Partial<VitalSigns> {
  telefono?: string;
  direccion?: string;
  contacto_emergencia?: string;
  telefono_emergencia?: string;
}

export interface NotificationPreferences {
  daily_meds_enabled: boolean;
  single_med_enabled: boolean;
  appointments_enabled: boolean;
}

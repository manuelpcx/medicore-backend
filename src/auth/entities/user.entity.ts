import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Patient } from '../../patients/entities/patient.entity';
import { encryptedColumn } from '../../common/crypto/encryption';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'text', transformer: encryptedColumn() })
  nombre: string;

  @Exclude()
  @Column()
  password: string;

  // Cifrado en reposo — se almacena y devuelve como string (ISO) cifrado.
  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  fecha_nacimiento: string | null;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  tipo_sangre: string;

  @Column({ default: true })
  activo: boolean;

  /** Rol de acceso. 'user' para pacientes, 'admin' para el panel de administración. */
  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: 'user' | 'admin';

  /** Fecha del último login exitoso. Se actualiza en cada POST /auth/login. */
  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date | null;

  /**
   * Consentimiento explícito al tratamiento de datos personales de salud.
   * Requerido por Ley 19.628 / Ley 21.719 (Chile) antes de procesar datos sensibles.
   */
  @Column({ default: false })
  consent_accepted: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  consent_date: Date | null;

  /** Preferencias de notificaciones por email */
  @Column({ default: true })
  notif_daily_meds: boolean;

  @Column({ default: true })
  notif_single_med: boolean;

  @Column({ default: true })
  notif_appointments: boolean;

  /**
   * Grupo familiar al que pertenece la cuenta (columna escalar; la FK
   * → family_groups(id) ON DELETE SET NULL se declara en la migración R7).
   * Se usa escalar para evitar dependencia circular User ↔ FamilyGroup.
   */
  @Column({ type: 'uuid', nullable: true })
  family_group_id: string | null;

  /** Plan de la cuenta. Solo `family` habilita ser owner e invitar. */
  @Column({ type: 'varchar', length: 20, default: 'free' })
  plan: 'free' | 'pro' | 'family';

  @OneToOne(() => Patient, (patient) => patient.user, { cascade: true })
  patient: Patient;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

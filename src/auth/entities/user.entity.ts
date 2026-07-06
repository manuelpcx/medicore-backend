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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  nombre: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento: Date;

  @Column({ nullable: true })
  tipo_sangre: string;

  @Column({ default: true })
  activo: boolean;

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

  @OneToOne(() => Patient, (patient) => patient.user, { cascade: true })
  patient: Patient;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

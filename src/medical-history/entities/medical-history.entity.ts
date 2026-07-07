import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { encryptedColumn } from '../../common/crypto/encryption';

export enum TipoConsulta {
  CONTROL = 'control',
  URGENCIA = 'urgencia',
  ESPECIALIDAD = 'especialidad',
  PREVENTIVO = 'preventivo',
}

@Entity('medical_history')
export class MedicalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient, (p) => p.historial, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'text', transformer: encryptedColumn() })
  especialidad: string;

  @Column({ type: 'text', transformer: encryptedColumn() })
  doctor: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  institucion: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  diagnostico: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  notas: string;

  @Column({ type: 'enum', enum: TipoConsulta, default: TipoConsulta.CONTROL })
  tipo: TipoConsulta;

  /** Fecha del próximo control asociado a esta consulta (para recordatorio al día siguiente). */
  @Column({ type: 'date', nullable: true })
  proxima_cita: Date | null;

  /** Tipo del próximo turno: "control" | "especialidad" | "examen" */
  @Column({ nullable: true, type: 'varchar', length: 20 })
  tipo_proxima_cita: string | null;

  /** Activa/desactiva el recordatorio de este próximo turno. */
  @Column({ default: true })
  recordatorio_activo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

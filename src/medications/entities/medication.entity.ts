import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { encryptedColumn } from '../../common/crypto/encryption';

export enum EstadoMedicamento {
  ACTIVO = 'activo',
  FINALIZADO = 'finalizado',
}

@Entity('medications')
export class Medication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient, (p) => p.medicamentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'text', transformer: encryptedColumn() })
  nombre: string;

  @Column({ type: 'text', transformer: encryptedColumn() })
  dosis: string;

  @Column({ type: 'text', transformer: encryptedColumn() })
  frecuencia: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  horario: string;

  @Column({ type: 'enum', enum: EstadoMedicamento, default: EstadoMedicamento.ACTIVO })
  estado: EstadoMedicamento;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  medico_recetante: string;

  @Column({ type: 'date', nullable: true })
  fecha_inicio: Date;

  @Column({ type: 'date', nullable: true })
  fecha_fin: Date;

  /** Hora exacta de notificación en formato "HH:mm" (ej: "08:00"). Null = sin notificación puntual. */
  @Column({ nullable: true, type: 'varchar', length: 5, comment: 'HH:mm' })
  horario_notificacion: string | null;

  /** Activa/desactiva todos los recordatorios para este medicamento. */
  @Column({ default: true })
  notificacion_activa: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

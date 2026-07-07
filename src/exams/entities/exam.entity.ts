import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { encryptedColumn } from '../../common/crypto/encryption';

export enum ResultadoBadge {
  NORMAL = 'normal',
  ALTERADO = 'alterado',
  PENDIENTE = 'pendiente',
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient, (p) => p.examenes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'text', transformer: encryptedColumn() })
  nombre: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  laboratorio: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  tipo: string;

  @Column({ type: 'enum', enum: ResultadoBadge, default: ResultadoBadge.PENDIENTE })
  resultado_badge: ResultadoBadge;

  @Column({ nullable: true })
  archivo_path: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  archivo_nombre: string;

  @Column({ nullable: true })
  archivo_mimetype: string;

  @CreateDateColumn()
  created_at: Date;
}

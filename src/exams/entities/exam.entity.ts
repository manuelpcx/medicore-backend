import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

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

  @Column()
  nombre: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ nullable: true })
  laboratorio: string;

  @Column({ nullable: true })
  tipo: string;

  @Column({ type: 'enum', enum: ResultadoBadge, default: ResultadoBadge.PENDIENTE })
  resultado_badge: ResultadoBadge;

  @Column({ nullable: true })
  archivo_path: string;

  @Column({ nullable: true })
  archivo_nombre: string;

  @Column({ nullable: true })
  archivo_mimetype: string;

  @CreateDateColumn()
  created_at: Date;
}

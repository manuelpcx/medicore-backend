import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

@Entity('vaccines')
export class Vaccine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient, (p) => p.vacunas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
  nombre: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ nullable: true })
  lote: string;

  @Column({ nullable: true })
  institucion: string;

  @Column({ type: 'date', nullable: true })
  proxima_dosis: Date;

  @CreateDateColumn()
  created_at: Date;
}

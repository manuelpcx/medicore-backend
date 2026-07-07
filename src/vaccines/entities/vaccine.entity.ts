import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import { encryptedColumn } from '../../common/crypto/encryption';

@Entity('vaccines')
export class Vaccine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient, (p) => p.vacunas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'text', transformer: encryptedColumn() })
  nombre: string;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  lote: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  institucion: string;

  @Column({ type: 'date', nullable: true })
  proxima_dosis: Date;

  @CreateDateColumn()
  created_at: Date;
}

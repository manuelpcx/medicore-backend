import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';

export enum SeveridadAlergia {
  LEVE = 'leve',
  MODERADA = 'moderada',
  SEVERA = 'severa',
}

export enum TipoAlergia {
  MEDICAMENTO = 'medicamento',
  ALIMENTARIA = 'alimentaria',
  AMBIENTAL = 'ambiental',
  OTRA = 'otra',
}

@Entity('allergies')
export class Allergy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patient_id: string;

  @ManyToOne(() => Patient, (p) => p.alergias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column()
  nombre: string;

  @Column({ type: 'enum', enum: SeveridadAlergia })
  severidad: SeveridadAlergia;

  @Column({ type: 'enum', enum: TipoAlergia, default: TipoAlergia.OTRA })
  tipo: TipoAlergia;

  @CreateDateColumn()
  created_at: Date;
}

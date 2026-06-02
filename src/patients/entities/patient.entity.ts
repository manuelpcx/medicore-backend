import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { MedicalHistory } from '../../medical-history/entities/medical-history.entity';
import { Medication } from '../../medications/entities/medication.entity';
import { Exam } from '../../exams/entities/exam.entity';
import { Allergy } from '../../allergies/entities/allergy.entity';
import { Vaccine } from '../../vaccines/entities/vaccine.entity';
import { AccessCode } from '../../access-codes/entities/access-code.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Signos vitales
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  peso: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  altura: number;

  @Column({ nullable: true })
  presion_arterial: string;

  @Column({ type: 'int', nullable: true })
  frecuencia_cardiaca: number;

  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  temperatura: number;

  @Column({ nullable: true })
  telefono: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  contacto_emergencia: string;

  @Column({ nullable: true })
  telefono_emergencia: string;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => MedicalHistory, (h) => h.patient)
  historial: MedicalHistory[];

  @OneToMany(() => Medication, (m) => m.patient)
  medicamentos: Medication[];

  @OneToMany(() => Exam, (e) => e.patient)
  examenes: Exam[];

  @OneToMany(() => Allergy, (a) => a.patient)
  alergias: Allergy[];

  @OneToMany(() => Vaccine, (v) => v.patient)
  vacunas: Vaccine[];

  @OneToMany(() => AccessCode, (ac) => ac.patient)
  access_codes: AccessCode[];
}

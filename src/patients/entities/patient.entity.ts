import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
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
import { encryptedColumn } from '../../common/crypto/encryption';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Nullable: un menor dependiente no tiene cuenta/`User` (user_id = null).
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ── Menor dependiente (espacio del menor) ──────────────────────────────────
  // Adulto propietario que administra a este menor (null en pacientes adultos).
  @Column({ type: 'uuid', nullable: true })
  owner_id: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ default: false })
  is_minor: boolean;

  // Fecha de nacimiento del menor: `date` (sin cifrar) para calcular la edad.
  @Column({ type: 'date', nullable: true })
  birth_date: string | null;

  // Consentimiento del adulto: quién lo dio y cuándo.
  @Column({ type: 'uuid', nullable: true })
  consent_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  consent_at: Date | null;

  // Identidad del menor (no hay `User` de dónde tomarla). `nombre` es PII -> cifrado.
  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  nombre: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  sexo: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  relacion: string | null;

  // Signos vitales — cifrados en reposo (se devuelven como string cifrado).
  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  peso: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  altura: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  presion_arterial: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  frecuencia_cardiaca: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  temperatura: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  telefono: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  direccion: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
  contacto_emergencia: string;

  @Column({ type: 'text', nullable: true, transformer: encryptedColumn() })
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

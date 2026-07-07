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
import { encryptedColumn } from '../../common/crypto/encryption';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

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

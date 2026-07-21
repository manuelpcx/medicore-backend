import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { User } from '../auth/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Patient } from '../patients/entities/patient.entity';
import { MedicalHistory, TipoConsulta } from '../medical-history/entities/medical-history.entity';
import { Medication, EstadoMedicamento } from '../medications/entities/medication.entity';
import { Exam, ResultadoBadge } from '../exams/entities/exam.entity';
import { Allergy, SeveridadAlergia, TipoAlergia } from '../allergies/entities/allergy.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';
import { AccessCode } from '../access-codes/entities/access-code.entity';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, RefreshToken, Patient, MedicalHistory, Medication, Exam, Allergy, Vaccine, AccessCode],
  // El seed asume un esquema ya gestionado por migraciones — no muta el esquema
  synchronize: false,
});

async function seed() {
  await ds.initialize();
  console.log('📦 Conectado a la base de datos');

  const userRepo = ds.getRepository(User);
  const patientRepo = ds.getRepository(Patient);
  const historyRepo = ds.getRepository(MedicalHistory);
  const medRepo = ds.getRepository(Medication);
  const examRepo = ds.getRepository(Exam);
  const allergyRepo = ds.getRepository(Allergy);
  const vaccineRepo = ds.getRepository(Vaccine);

  // Limpiar datos previos del demo
  const existing = await userRepo.findOne({ where: { email: 'jesus.mendez@demo.com' } });
  if (existing) {
    await userRepo.remove(existing);
    console.log('🗑️  Datos previos del demo eliminados');
  }

  // Crear usuario demo
  const passwordHash = await bcrypt.hash('Demo1234!', 10);
  const user = userRepo.create({
    email: 'jesus.mendez@demo.com',
    nombre: 'Jesús Méndez',
    password: passwordHash,
    fecha_nacimiento: new Date('1990-05-15') as any,
    tipo_sangre: 'O+',
  });
  await userRepo.save(user);

  // Crear perfil paciente
  const patient = patientRepo.create({
    user_id: user.id,
    peso: '78.5',
    altura: '1.75',
    presion_arterial: '120/80',
    frecuencia_cardiaca: '72',
    temperatura: '36.6',
    telefono: '+52 55 1234 5678',
    contacto_emergencia: 'María Méndez (madre)',
    telefono_emergencia: '+52 55 8765 4321',
  });
  await patientRepo.save(patient);

  // Historial médico
  await historyRepo.save([
    historyRepo.create({
      patient_id: patient.id,
      fecha: new Date('2026-04-10') as any,
      especialidad: 'Medicina General',
      doctor: 'Dra. Ana Torres',
      institucion: 'Clínica Santa Fe',
      diagnostico: 'Hipertensión arterial leve. Control mensual recomendado.',
      notas: 'Paciente refiere cefalea ocasional. Recomienda reducir consumo de sal.',
      tipo: TipoConsulta.CONTROL,
    }),
    historyRepo.create({
      patient_id: patient.id,
      fecha: new Date('2026-02-20') as any,
      especialidad: 'Cardiología',
      doctor: 'Dr. Roberto Gómez',
      institucion: 'Hospital Ángeles',
      diagnostico: 'Electrocardiograma normal. Sin alteraciones.',
      notas: 'Chequeo de rutina por antecedentes familiares.',
      tipo: TipoConsulta.ESPECIALIDAD,
    }),
    historyRepo.create({
      patient_id: patient.id,
      fecha: new Date('2025-12-05') as any,
      especialidad: 'Medicina Preventiva',
      doctor: 'Dr. Luis Martínez',
      institucion: 'IMSS',
      diagnostico: 'Chequeo anual. Resultados dentro de parámetros normales.',
      tipo: TipoConsulta.PREVENTIVO,
    }),
  ]);

  // Medicamentos
  await medRepo.save([
    medRepo.create({
      patient_id: patient.id,
      nombre: 'Losartán',
      dosis: '50mg',
      frecuencia: 'Una vez al día',
      horario: '08:00',
      estado: EstadoMedicamento.ACTIVO,
      medico_recetante: 'Dra. Ana Torres',
      fecha_inicio: new Date('2026-04-10') as any,
    }),
    medRepo.create({
      patient_id: patient.id,
      nombre: 'Ácido acetilsalicílico',
      dosis: '100mg',
      frecuencia: 'Una vez al día',
      horario: '08:00',
      estado: EstadoMedicamento.ACTIVO,
      medico_recetante: 'Dr. Roberto Gómez',
      fecha_inicio: new Date('2026-02-20') as any,
    }),
    medRepo.create({
      patient_id: patient.id,
      nombre: 'Amoxicilina',
      dosis: '500mg',
      frecuencia: 'Cada 8 horas',
      estado: EstadoMedicamento.FINALIZADO,
      medico_recetante: 'Dra. Ana Torres',
      fecha_inicio: new Date('2025-11-01') as any,
      fecha_fin: new Date('2025-11-10') as any,
    }),
  ]);

  // Exámenes
  await examRepo.save([
    examRepo.create({
      patient_id: patient.id,
      nombre: 'Biometría Hemática Completa',
      fecha: new Date('2026-03-15') as any,
      laboratorio: 'Laboratorio Diagnóstica',
      tipo: 'Sangre',
      resultado_badge: ResultadoBadge.NORMAL,
    }),
    examRepo.create({
      patient_id: patient.id,
      nombre: 'Perfil Lipídico',
      fecha: new Date('2026-03-15') as any,
      laboratorio: 'Laboratorio Diagnóstica',
      tipo: 'Sangre',
      resultado_badge: ResultadoBadge.ALTERADO,
    }),
    examRepo.create({
      patient_id: patient.id,
      nombre: 'Radiografía de Tórax',
      fecha: new Date('2026-02-20') as any,
      laboratorio: 'Hospital Ángeles — Radiología',
      tipo: 'Imagen',
      resultado_badge: ResultadoBadge.NORMAL,
    }),
  ]);

  // Alergias
  await allergyRepo.save([
    allergyRepo.create({
      patient_id: patient.id,
      nombre: 'Penicilina',
      severidad: SeveridadAlergia.SEVERA,
      tipo: TipoAlergia.MEDICAMENTO,
    }),
    allergyRepo.create({
      patient_id: patient.id,
      nombre: 'Mariscos',
      severidad: SeveridadAlergia.MODERADA,
      tipo: TipoAlergia.ALIMENTARIA,
    }),
    allergyRepo.create({
      patient_id: patient.id,
      nombre: 'Polen',
      severidad: SeveridadAlergia.LEVE,
      tipo: TipoAlergia.AMBIENTAL,
    }),
  ]);

  // Vacunas
  await vaccineRepo.save([
    vaccineRepo.create({
      patient_id: patient.id,
      nombre: 'COVID-19 Pfizer-BioNTech (refuerzo)',
      fecha: new Date('2024-09-10') as any,
      lote: 'EW0182',
      institucion: 'Centro de Salud Norte',
    }),
    vaccineRepo.create({
      patient_id: patient.id,
      nombre: 'Influenza',
      fecha: new Date('2025-10-15') as any,
      lote: 'FL2025-A',
      institucion: 'IMSS',
      proxima_dosis: new Date('2026-10-15') as any,
    }),
    vaccineRepo.create({
      patient_id: patient.id,
      nombre: 'Tétanos (Td)',
      fecha: new Date('2022-03-20') as any,
      lote: 'TD0456',
      institucion: 'IMSS',
      proxima_dosis: new Date('2032-03-20') as any,
    }),
  ]);

  console.log('✅ Seed completado:');
  console.log('   👤 Usuario: jesus.mendez@demo.com');
  console.log('   🔑 Password: Demo1234!');
  console.log('   📋 3 consultas | 3 medicamentos | 3 exámenes | 3 alergias | 3 vacunas');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});

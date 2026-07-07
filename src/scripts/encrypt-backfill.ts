/**
 * Cifra los datos existentes en claro (backfill de una sola vez).
 *
 * Requisitos previos:
 *   1. ENCRYPTION_KEY definida en el entorno (la MISMA que usará la app).
 *   2. La migración EncryptSensitiveColumns ya aplicada (columnas -> text).
 *
 * Uso:  npm run encrypt-backfill
 *
 * Idempotente: un valor ya cifrado se descifra al leer (por el marcador
 * "enc:v1:") y se re-cifra sin cambiar el texto plano. Correrlo dos veces
 * no corrompe ni duplica nada.
 */
import 'reflect-metadata';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config();

import { assertEncryptionKey } from '../common/crypto/encryption';
import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';
import { MedicalHistory } from '../medical-history/entities/medical-history.entity';
import { Medication } from '../medications/entities/medication.entity';
import { Exam } from '../exams/entities/exam.entity';
import { Allergy } from '../allergies/entities/allergy.entity';
import { Vaccine } from '../vaccines/entities/vaccine.entity';

const isProd = process.env.NODE_ENV === 'production';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});

// Entidades con al menos una columna cifrada (AccessCode no tiene ninguna).
const TARGETS = [User, Patient, MedicalHistory, Medication, Exam, Allergy, Vaccine];

async function backfillRepo(repo: Repository<ObjectLiteral>, label: string) {
  const rows = await repo.find();
  if (rows.length === 0) {
    console.log(`   • ${label}: 0 filas`);
    return;
  }
  // save() dispara el transformer -> cifra cada columna sensible al escribir.
  await repo.save(rows, { chunk: 200 });
  console.log(`   • ${label}: ${rows.length} fila(s) cifradas`);
}

async function run() {
  assertEncryptionKey(); // fail-fast si la llave falta o es inválida
  await ds.initialize();
  console.log('🔐 Iniciando backfill de cifrado…');

  for (const entity of TARGETS) {
    const repo = ds.getRepository(entity);
    await backfillRepo(repo, entity.name);
  }

  await ds.destroy();
  console.log('✅ Backfill completado. Todos los datos sensibles quedaron cifrados.');
}

run().catch((err) => {
  console.error('❌ Error en el backfill:', err);
  process.exit(1);
});

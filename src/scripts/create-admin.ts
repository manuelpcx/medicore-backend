/**
 * Crea o promueve un usuario a administrador.
 *
 * Uso (ejecutar manualmente una sola vez):
 *   npm run create-admin -- <email> <password>
 * o mediante variables de entorno:
 *   ADMIN_EMAIL=admin@medicore.com ADMIN_PASSWORD=Secreto123! npm run create-admin
 *
 * - Si el usuario ya existe: se le asigna role='admin' (y se actualiza la
 *   contraseña si se proporciona una).
 * - Si no existe: se crea el usuario con role='admin' y su perfil de paciente
 *   vinculado (igual que un registro normal).
 *
 * Requiere DATABASE_URL en el entorno (.env o Railway).
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ quiet: true });

import { User } from '../auth/entities/user.entity';
import { Patient } from '../patients/entities/patient.entity';

const isProd = process.env.NODE_ENV === 'production';

const ds = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  ssl: isProd ? { rejectUnauthorized: false } : false,
  // Cargar todas las entidades por glob (evita listarlas una a una)
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});

async function createAdmin() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      '❌ Faltan credenciales.\n' +
        '   Uso: npm run create-admin -- <email> <password>\n' +
        '   o define ADMIN_EMAIL y ADMIN_PASSWORD en el entorno.',
    );
    process.exit(1);
  }

  await ds.initialize();
  const userRepo = ds.getRepository(User);
  const patientRepo = ds.getRepository(Patient);

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await userRepo.findOne({ where: { email } });

  if (existing) {
    existing.role = 'admin';
    existing.password = passwordHash;
    existing.activo = true;
    await userRepo.save(existing);
    console.log(`✅ Usuario existente promovido a admin: ${email}`);
  } else {
    const user = userRepo.create({
      email,
      nombre: 'Administrador',
      password: passwordHash,
      role: 'admin',
      activo: true,
      consent_accepted: true,
      consent_date: new Date(),
    });
    await userRepo.save(user);

    // Perfil de paciente vinculado, igual que en el registro normal
    await patientRepo.save(patientRepo.create({ user_id: user.id }));
    console.log(`✅ Admin creado: ${email}`);
  }

  await ds.destroy();
}

createAdmin().catch((err) => {
  console.error('❌ Error creando admin:', err);
  process.exit(1);
});

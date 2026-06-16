/**
 * TypeORM DataSource para CLI (migraciones).
 * Uso:
 *   npm run migration:generate -- src/database/migrations/NombreMigracion
 *   npm run migration:run
 *   npm run migration:revert
 *
 * Requiere que DATABASE_URL esté disponible en el entorno (via .env o Railway).
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
  ssl: isProd ? { rejectUnauthorized: false } : false,

  // Entidades (path a los archivos compilados en dist/ para el CLI)
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],

  // Migraciones
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations_history',
});

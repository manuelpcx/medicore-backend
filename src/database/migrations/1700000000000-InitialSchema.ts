import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración inicial — crea todas las tablas de Medicore.
 * Generada a partir del estado actual de las entidades.
 * En producción ejecutar: npm run migration:run
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── users ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"                  uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "email"               character varying NOT NULL,
        "nombre"              character varying NOT NULL,
        "password"            character varying NOT NULL,
        "fecha_nacimiento"    date,
        "tipo_sangre"         character varying,
        "activo"              boolean           NOT NULL DEFAULT true,
        "notif_daily_meds"    boolean           NOT NULL DEFAULT true,
        "notif_single_med"    boolean           NOT NULL DEFAULT true,
        "notif_appointments"  boolean           NOT NULL DEFAULT true,
        "created_at"          TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // ── patients ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients" (
        "id"                    uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"               uuid              NOT NULL,
        "peso"                  numeric(5,2),
        "altura"                numeric(4,2),
        "presion_arterial"      character varying,
        "frecuencia_cardiaca"   integer,
        "temperatura"           numeric(4,1),
        "telefono"              character varying,
        "direccion"             text,
        "contacto_emergencia"   character varying,
        "telefono_emergencia"   character varying,
        "updated_at"            TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_patients_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_patients" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patients_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // ── refresh_tokens ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     uuid              NOT NULL,
        "token_hash"  character varying NOT NULL,
        "expires_at"  TIMESTAMP         NOT NULL,
        "revocado"    boolean           NOT NULL DEFAULT false,
        "created_at"  TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    // ── medical_history ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "medical_history_tipo_enum"
        AS ENUM ('control', 'urgencia', 'especialidad', 'preventivo')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medical_history" (
        "id"                    uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"            uuid              NOT NULL,
        "fecha"                 date              NOT NULL,
        "especialidad"          character varying NOT NULL,
        "doctor"                character varying NOT NULL,
        "institucion"           character varying,
        "diagnostico"           text,
        "notas"                 text,
        "tipo"                  "medical_history_tipo_enum" NOT NULL DEFAULT 'control',
        "proxima_cita"          date,
        "tipo_proxima_cita"     character varying(20),
        "recordatorio_activo"   boolean           NOT NULL DEFAULT true,
        "created_at"            TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medical_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_medical_history_patient" FOREIGN KEY ("patient_id")
          REFERENCES "patients" ("id") ON DELETE CASCADE
      )
    `);

    // ── medications ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "medications_estado_enum"
        AS ENUM ('activo', 'finalizado')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medications" (
        "id"                      uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"              uuid              NOT NULL,
        "nombre"                  character varying NOT NULL,
        "dosis"                   character varying NOT NULL,
        "frecuencia"              character varying NOT NULL,
        "horario"                 character varying,
        "estado"                  "medications_estado_enum" NOT NULL DEFAULT 'activo',
        "medico_recetante"        character varying,
        "fecha_inicio"            date,
        "fecha_fin"               date,
        "horario_notificacion"    character varying(5),
        "notificacion_activa"     boolean           NOT NULL DEFAULT true,
        "created_at"              TIMESTAMP         NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_medications_patient" FOREIGN KEY ("patient_id")
          REFERENCES "patients" ("id") ON DELETE CASCADE
      )
    `);

    // ── exams ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exams" (
        "id"                uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"        uuid              NOT NULL,
        "nombre"            character varying NOT NULL,
        "fecha"             date              NOT NULL,
        "laboratorio"       character varying,
        "tipo"              character varying,
        "resultado_badge"   character varying NOT NULL DEFAULT 'pendiente',
        "archivo_path"      character varying,
        "archivo_nombre"    character varying,
        "archivo_mimetype"  character varying,
        "created_at"        TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exams" PRIMARY KEY ("id"),
        CONSTRAINT "FK_exams_patient" FOREIGN KEY ("patient_id")
          REFERENCES "patients" ("id") ON DELETE CASCADE
      )
    `);

    // ── allergies ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "allergies_severidad_enum"
        AS ENUM ('leve', 'moderada', 'severa')
    `);
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "allergies_tipo_enum"
        AS ENUM ('medicamento', 'alimentaria', 'ambiental', 'otra')
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "allergies" (
        "id"          uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"  uuid              NOT NULL,
        "nombre"      character varying NOT NULL,
        "severidad"   "allergies_severidad_enum" NOT NULL DEFAULT 'leve',
        "tipo"        "allergies_tipo_enum"       NOT NULL DEFAULT 'otra',
        "created_at"  TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_allergies" PRIMARY KEY ("id"),
        CONSTRAINT "FK_allergies_patient" FOREIGN KEY ("patient_id")
          REFERENCES "patients" ("id") ON DELETE CASCADE
      )
    `);

    // ── vaccines ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vaccines" (
        "id"            uuid              NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"    uuid              NOT NULL,
        "nombre"        character varying NOT NULL,
        "fecha"         date              NOT NULL,
        "lote"          character varying,
        "institucion"   character varying,
        "proxima_dosis" date,
        "created_at"    TIMESTAMP         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vaccines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vaccines_patient" FOREIGN KEY ("patient_id")
          REFERENCES "patients" ("id") ON DELETE CASCADE
      )
    `);

    // ── access_codes ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "access_codes" (
        "id"          uuid      NOT NULL DEFAULT uuid_generate_v4(),
        "patient_id"  uuid      NOT NULL,
        "code_hash"   character varying NOT NULL,
        "expires_at"  TIMESTAMP NOT NULL,
        "usado"       boolean   NOT NULL DEFAULT false,
        "revocado"    boolean   NOT NULL DEFAULT false,
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_access_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_access_codes_patient" FOREIGN KEY ("patient_id")
          REFERENCES "patients" ("id") ON DELETE CASCADE
      )
    `);

    // ── uuid extension (necesaria para uuid_generate_v4) ─────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "access_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vaccines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "allergies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "allergies_tipo_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "allergies_severidad_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medications_estado_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "medical_history_tipo_enum"`);
  }
}

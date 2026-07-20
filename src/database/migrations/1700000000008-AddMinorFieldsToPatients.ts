import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Espacio del menor: el menor es un `Patient` dependiente del adulto.
 *
 * - `patients.user_id` deja de ser NOT NULL (el menor no tiene cuenta/`User`).
 * - Se añaden `owner_id` (FK users, ON DELETE CASCADE: si el adulto se va, sus
 *   menores desaparecen), `is_minor`, `birth_date`, `consent_by`
 *   (FK users, ON DELETE SET NULL) + `consent_at`, y la identidad del menor
 *   sin `User`: `nombre` (cifrado en reposo, se guarda como texto), `sexo`,
 *   `relacion`.
 *
 * Idempotente (IF NOT EXISTS / DO $$ pg_constraint) igual que el resto del
 * historial. La UNIQUE `UQ_...user_id` no estorba: Postgres trata múltiples
 * NULL como distintos, así que varios menores con user_id = NULL conviven.
 */
export class AddMinorFieldsToPatients1700000000008
  implements MigrationInterface
{
  name = 'AddMinorFieldsToPatients1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. user_id pasa a nullable.
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "user_id" DROP NOT NULL`,
    );

    // 2. Nuevas columnas del menor.
    await queryRunner.query(`
      ALTER TABLE "patients"
        ADD COLUMN IF NOT EXISTS "owner_id"   uuid,
        ADD COLUMN IF NOT EXISTS "is_minor"   boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "birth_date" date,
        ADD COLUMN IF NOT EXISTS "consent_by" uuid,
        ADD COLUMN IF NOT EXISTS "consent_at" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "nombre"     text,
        ADD COLUMN IF NOT EXISTS "sexo"       character varying(20),
        ADD COLUMN IF NOT EXISTS "relacion"   character varying(30)
    `);

    // 3. FK owner_id -> users(id), ON DELETE CASCADE.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_patients_owner'
        ) THEN
          ALTER TABLE "patients"
            ADD CONSTRAINT "FK_patients_owner" FOREIGN KEY ("owner_id")
            REFERENCES "users" ("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // 4. FK consent_by -> users(id), ON DELETE SET NULL.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_patients_consent_by'
        ) THEN
          ALTER TABLE "patients"
            ADD CONSTRAINT "FK_patients_consent_by" FOREIGN KEY ("consent_by")
            REFERENCES "users" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "FK_patients_consent_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "FK_patients_owner"`,
    );
    await queryRunner.query(`
      ALTER TABLE "patients"
        DROP COLUMN IF EXISTS "relacion",
        DROP COLUMN IF EXISTS "sexo",
        DROP COLUMN IF EXISTS "nombre",
        DROP COLUMN IF EXISTS "consent_at",
        DROP COLUMN IF EXISTS "consent_by",
        DROP COLUMN IF EXISTS "birth_date",
        DROP COLUMN IF EXISTS "is_minor",
        DROP COLUMN IF EXISTS "owner_id"
    `);
    // Requiere que no queden Patient con user_id NULL para volver a NOT NULL.
    await queryRunner.query(
      `ALTER TABLE "patients" ALTER COLUMN "user_id" SET NOT NULL`,
    );
  }
}

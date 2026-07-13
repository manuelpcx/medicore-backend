import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `family_group_id` al usuario con su FK → family_groups(id).
 * ON DELETE SET NULL: si el grupo se borra, el miembro queda desvinculado pero
 * conserva su cuenta e historial. Depende de que family_groups ya exista
 * (migración 1700000000006).
 */
export class AddUserFamilyGroupId1700000000007 implements MigrationInterface {
  name = 'AddUserFamilyGroupId1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "family_group_id" uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_family_group'
        ) THEN
          ALTER TABLE "users"
            ADD CONSTRAINT "FK_users_family_group" FOREIGN KEY ("family_group_id")
            REFERENCES "family_groups" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_family_group"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "family_group_id"`,
    );
  }
}

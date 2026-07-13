import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la columna `plan` al usuario.
 * plan: 'free' | 'pro' | 'family' (default 'free'). Solo `family` habilita
 * ser owner de un grupo familiar e invitar miembros.
 */
export class AddUserPlan1700000000005 implements MigrationInterface {
  name = 'AddUserPlan1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "plan" character varying(20) NOT NULL DEFAULT 'free'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "plan"`);
  }
}

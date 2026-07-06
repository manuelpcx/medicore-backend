import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConsentColumns1700000000001 implements MigrationInterface {
  name = 'AddConsentColumns1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "consent_accepted" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "consent_date"     TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "consent_date"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "consent_accepted"`);
  }
}

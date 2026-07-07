import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega la marca de medicamento de uso indefinido.
 * `permanente = true` significa que el medicamento no tiene fecha de fin.
 */
export class AddMedicationPermanente1700000000004 implements MigrationInterface {
  name = 'AddMedicationPermanente1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "medications"
        ADD COLUMN IF NOT EXISTS "permanente" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "medications" DROP COLUMN IF EXISTS "permanente"`);
  }
}

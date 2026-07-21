import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cupo familiar unificado (#21): el tope del plan familiar pasa de 4 a 5 en
 * total (titular + 4). Los menores dependientes cuentan dentro del mismo cupo,
 * por lo que `max_members` se convierte en el tope unificado del titular.
 *
 * - `up()`: deja el DEFAULT de la columna en 5 y sube a 5 los grupos existentes
 *   que aún tuvieran el valor anterior (4). Idempotente: el DEFAULT se
 *   sobrescribe sin condición y el UPDATE solo afecta a las filas con 4.
 * - `down()`: revierte los grupos a 4 (solo los que estén en 5) y el DEFAULT a 4.
 */
export class BumpFamilyMaxMembersTo51700000000009
  implements MigrationInterface
{
  name = 'BumpFamilyMaxMembersTo51700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "family_groups" ALTER COLUMN "max_members" SET DEFAULT 5`,
    );
    await queryRunner.query(
      `UPDATE "family_groups" SET "max_members" = 5 WHERE "max_members" = 4`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "family_groups" SET "max_members" = 4 WHERE "max_members" = 5`,
    );
    await queryRunner.query(
      `ALTER TABLE "family_groups" ALTER COLUMN "max_members" SET DEFAULT 4`,
    );
  }
}

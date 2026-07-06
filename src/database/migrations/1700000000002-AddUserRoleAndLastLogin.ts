import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega el rol de acceso y la marca de último login al usuario.
 * - role: 'user' | 'admin' (default 'user') — habilita el panel de administración.
 * - last_login_at: se actualiza en cada login exitoso, usado por /admin/stats.
 */
export class AddUserRoleAndLastLogin1700000000002 implements MigrationInterface {
  name = 'AddUserRoleAndLastLogin1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "role"          character varying(20) NOT NULL DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea las tablas del plan familiar:
 * - family_groups: grupo del titular (owner_id → users, ON DELETE CASCADE).
 * - family_members: invitados al grupo (family_group_id → family_groups,
 *   user_id → users nullable, invited_by → users; todas ON DELETE CASCADE).
 */
export class CreateFamilyTables1700000000006 implements MigrationInterface {
  name = 'CreateFamilyTables1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "family_groups" (
        "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id"    uuid        NOT NULL,
        "max_members" integer     NOT NULL DEFAULT 4,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_family_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_family_groups_owner" FOREIGN KEY ("owner_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "family_members" (
        "id"              uuid                  NOT NULL DEFAULT uuid_generate_v4(),
        "family_group_id" uuid                  NOT NULL,
        "user_id"         uuid,
        "email"           character varying     NOT NULL,
        "relationship"    character varying(20) NOT NULL,
        "invited_by"      uuid                  NOT NULL,
        "status"          character varying(20) NOT NULL DEFAULT 'pending',
        "invited_at"      TIMESTAMPTZ           NOT NULL DEFAULT now(),
        "accepted_at"     TIMESTAMPTZ,
        CONSTRAINT "PK_family_members" PRIMARY KEY ("id"),
        CONSTRAINT "FK_family_members_group" FOREIGN KEY ("family_group_id")
          REFERENCES "family_groups" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_family_members_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_family_members_invited_by" FOREIGN KEY ("invited_by")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "family_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "family_groups"`);
  }
}

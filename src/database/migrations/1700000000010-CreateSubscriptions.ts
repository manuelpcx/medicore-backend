import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla `subscriptions` (pagos recurrentes Flow.cl — planes pro/family).
 * No toca ninguna tabla existente.
 */
export class CreateSubscriptions1700000000010 implements MigrationInterface {
  name = 'CreateSubscriptions1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id"                    uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"               uuid          NOT NULL,
        "plan"                  varchar(20)   NOT NULL,
        "flow_customer_id"      varchar,
        "flow_subscription_id"  varchar,
        "flow_register_token"   varchar,
        "status"                varchar(20)   NOT NULL DEFAULT 'pending',
        "current_period_end"    TIMESTAMPTZ,
        "cancel_at_period_end"  boolean       NOT NULL DEFAULT false,
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_user_id" ON "subscriptions" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_user_status" ON "subscriptions" ("user_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_flow_subscription_id" ON "subscriptions" ("flow_subscription_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_subscriptions_flow_register_token" ON "subscriptions" ("flow_register_token")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
  }
}

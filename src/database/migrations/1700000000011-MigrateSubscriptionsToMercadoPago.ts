import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migra `subscriptions` de Flow.cl a MercadoPago (feature 41): añade
 * `mp_preapproval_id` (id de la `preapproval` de MercadoPago) y elimina las
 * 3 columnas `flow_*` (ver `specs/migrar-pagos-a-mercadopago/design.md` §6 —
 * DROP directo, no soft-deprecation: Flow nunca llegó a activar Cargo
 * Automático en producción, no hay `flow_subscription_id` real que preservar).
 */
export class MigrateSubscriptionsToMercadoPago1700000000011 implements MigrationInterface {
  name = 'MigrateSubscriptionsToMercadoPago1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "mp_preapproval_id" varchar`);
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_mp_preapproval_id" ON "subscriptions" ("mp_preapproval_id")`,
    );
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "flow_customer_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "flow_subscription_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "flow_register_token"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "flow_customer_id" varchar`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "flow_subscription_id" varchar`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN "flow_register_token" varchar`);
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_mp_preapproval_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "mp_preapproval_id"`);
  }
}

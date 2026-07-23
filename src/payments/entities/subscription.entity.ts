import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export type SubscriptionPlan = 'pro' | 'family';
export type SubscriptionStatus =
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'expired'
  // Cobro real (subscription_authorized_payment) rechazado tras una tarjeta
  // ya verificada, o timeout largo sin resolución (reconciliación, R17).
  // Distinto de 'expired' (cancelación / intento 'pending' sustituido por
  // uno nuevo): 'payment_failed' significa específicamente que MercadoPago
  // intentó cobrar el monto real del plan y no lo logró. No requiere
  // migración: `status` es `varchar(20)` sin `CHECK` constraint (ver
  // specs/mercadopago-activar-plan-en-cobro-real/design.md §1.3).
  | 'payment_failed';

/**
 * Suscripción de pago recurrente (MercadoPago) de un usuario a un plan
 * pagado (`pro`|`family`). Ver semántica de `status` en
 * `specs/migrar-pagos-a-mercadopago/design.md` §6.
 *
 * "Suscripción vigente" = status IN ('pending', 'active', 'past_due').
 */
@Entity('subscriptions')
@Index(['user_id', 'status'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  plan: SubscriptionPlan;

  // Id de la `preapproval` de MercadoPago asociada a esta fila (correlaciona
  // el webhook y la cancelación con esta Subscription local).
  @Column({ type: 'varchar', nullable: true })
  @Index()
  mp_preapproval_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_end: Date | null;

  @Column({ default: false })
  cancel_at_period_end: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

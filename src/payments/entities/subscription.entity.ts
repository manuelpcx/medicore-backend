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
  | 'expired';

/**
 * Suscripción de pago recurrente (Flow.cl) de un usuario a un plan pagado
 * (`pro`|`family`). Ver semántica de `status` en `specs/pagos-flow-suscripciones/design.md` §3.
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

  @Column({ type: 'varchar', nullable: true })
  flow_customer_id: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  flow_subscription_id: string | null;

  // Correlaciona el token que Flow envía al webhook con la fila 'pending'
  // creada en el checkout (aún no existe flow_subscription_id en ese punto).
  @Column({ type: 'varchar', nullable: true })
  @Index()
  flow_register_token: string | null;

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

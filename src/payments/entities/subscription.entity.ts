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

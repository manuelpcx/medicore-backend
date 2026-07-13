import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { FamilyGroup } from './family-group.entity';

/**
 * Miembro invitado a un grupo familiar. La propia fila `pending` es la
 * notificación in-app (ver GET /family/invitations). `user_id` es nullable
 * porque un invitado sin cuenta aún no tiene `User`; se rellena al aceptar.
 */
@Entity('family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  family_group_id: string;

  @ManyToOne(() => FamilyGroup, (g) => g.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'family_group_id' })
  group: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Email invitado normalizado (trim + lowercase).
  @Column({ type: 'varchar' })
  email: string;

  // Valor de {padre, madre, hijo/a, cónyuge, otro}.
  @Column({ type: 'varchar', length: 20 })
  relationship: string;

  @Column('uuid')
  invited_by: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invited_by' })
  inviter: User;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn({ type: 'timestamptz' })
  invited_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  accepted_at: Date | null;
}

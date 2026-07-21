import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { FamilyMember } from './family-member.entity';

/**
 * Grupo familiar. El titular (owner) es el contenedor del cupo unificado del
 * plan: `max_members` es el tope total (5 = titular + 4), que abarca tanto los
 * `FamilyMember` (pending/accepted) como los menores dependientes
 * (Patient is_minor con owner_id = titular). Ver #21 (cupo-familiar-unificado).
 */
@Entity('family_groups')
export class FamilyGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  owner_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'int', default: 5 })
  max_members: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => FamilyMember, (m) => m.group)
  members: FamilyMember[];
}

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
 * Grupo familiar. El titular (owner) con plan `family` puede invitar hasta
 * `max_members - 1` miembros (tope de 4 incluido el titular).
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

  @Column({ type: 'int', default: 4 })
  max_members: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => FamilyMember, (m) => m.group)
  members: FamilyMember[];
}

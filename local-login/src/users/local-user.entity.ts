import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('local_users')
export class LocalUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  passwordHash!: string;

  @Column()
  displayName!: string;

  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('proxy_relations')
export class ProxyRelation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  principalId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'principalId' })
  principal: User;

  @Column()
  proxyId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'proxyId' })
  proxy: User;

  @Column('text', { nullable: true })
  proxyRelation: string;

  @Column('text')
  authorizationScope: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  sourceApplicationId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

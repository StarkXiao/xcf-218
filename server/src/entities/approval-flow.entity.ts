import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApprovalNode } from './approval-node.entity';

@Entity('approval_flows')
export class ApprovalFlow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  serviceItemId: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ApprovalNode, node => node.flow)
  nodes: ApprovalNode[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApprovalFlow } from './approval-flow.entity';

@Entity('approval_nodes')
export class ApprovalNode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  flowId: number;

  @ManyToOne(() => ApprovalFlow, flow => flow.nodes)
  @JoinColumn({ name: 'flowId' })
  flow: ApprovalFlow;

  @Column()
  nodeName: string;

  @Column()
  nodeOrder: number;

  @Column()
  role: string;

  @Column({ nullable: true })
  department: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: true })
  allowReject: boolean;

  @Column({ default: true })
  allowTransfer: boolean;

  @Column({ default: false })
  isFinal: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

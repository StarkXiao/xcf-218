import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';
import { ApprovalNode } from './approval-node.entity';
import { User } from './user.entity';

@Entity('approval_histories')
export class ApprovalHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  flowId: number;

  @Column()
  nodeId: number;

  @ManyToOne(() => ApprovalNode)
  @JoinColumn({ name: 'nodeId' })
  node: ApprovalNode;

  @Column()
  operatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column()
  action: 'approve' | 'reject' | 'transfer' | 'withdraw' | 'enter' | 'complete';

  @Column('text', { nullable: true })
  remark: string;

  @Column({ nullable: true })
  targetNodeId: number;

  @Column({ nullable: true })
  previousNodeId: number;

  @Column({ default: 0 })
  durationMinutes: number;

  @CreateDateColumn()
  createdAt: Date;
}

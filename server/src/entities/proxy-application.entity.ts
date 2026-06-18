import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { ProxyProgressRecord } from './proxy-progress-record.entity';

@Entity('proxy_applications')
export class ProxyApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  applicationNo: string;

  @Column()
  principalId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'principalId' })
  principal: User;

  @Column()
  proxyName: string;

  @Column()
  proxyIdCard: string;

  @Column()
  proxyPhone: string;

  @Column('text', { nullable: true })
  proxyRelation: string;

  @Column('text')
  authorizationScope: string;

  @Column('text', { nullable: true })
  idCardFrontPath: string;

  @Column('text', { nullable: true })
  idCardBackPath: string;

  @Column('text', { nullable: true })
  authorizationLetterPath: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ nullable: true })
  reviewerId: number;

  @Column('text', { nullable: true })
  reviewComment: string;

  @Column({ default: 0 })
  riskLevel: number;

  @Column('text', { nullable: true })
  riskTips: string;

  @OneToMany(() => ProxyProgressRecord, record => record.proxyApplication)
  progressRecords: ProxyProgressRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

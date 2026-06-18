import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProxyApplication } from './proxy-application.entity';

@Entity('proxy_progress_records')
export class ProxyProgressRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proxyApplicationId: number;

  @ManyToOne(() => ProxyApplication, app => app.progressRecords)
  @JoinColumn({ name: 'proxyApplicationId' })
  proxyApplication: ProxyApplication;

  @Column()
  step: string;

  @Column()
  status: string;

  @Column('text', { nullable: true })
  remark: string;

  @Column({ nullable: true })
  operatorId: number;

  @CreateDateColumn()
  createdAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';

@Entity('progress_records')
export class ProgressRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application, application => application.progressRecords)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

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

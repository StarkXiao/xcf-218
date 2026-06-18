import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('export_archives')
export class ExportArchive {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  archiveNo: string;

  @Column('text')
  applicationIds: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column('text', { nullable: true })
  failReason: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ default: 0 })
  fileSize: number;

  @Column({ default: 0 })
  applicationCount: number;

  @Column()
  operatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

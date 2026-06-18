import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Application } from './application.entity';
import { ServiceItem } from './service-item.entity';
import { CertificateDownloadRecord } from './certificate-download-record.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  certificateNo: string;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  applicationId: number;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column()
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column()
  certificateType: string;

  @Column('text')
  certificateData: string;

  @Column('text', { nullable: true })
  certificateContent: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ default: 'generated' })
  status: string;

  @Column({ nullable: true })
  issuedBy: number;

  @Column({ type: 'datetime', nullable: true })
  issuedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiredAt: Date;

  @Column({ default: false })
  archived: boolean;

  @Column({ type: 'datetime', nullable: true })
  archivedAt: Date;

  @Column({ nullable: true })
  archivedBy: number;

  @OneToMany(() => CertificateDownloadRecord, record => record.certificate)
  downloadRecords: CertificateDownloadRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

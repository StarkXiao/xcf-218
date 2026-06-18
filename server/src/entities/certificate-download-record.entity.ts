import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Certificate } from './certificate.entity';
import { User } from './user.entity';

@Entity('certificate_download_records')
export class CertificateDownloadRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  certificateId: number;

  @ManyToOne(() => Certificate)
  @JoinColumn({ name: 'certificateId' })
  certificate: Certificate;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 'download' })
  action: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}

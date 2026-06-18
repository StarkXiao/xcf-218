import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_items')
export class ServiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  category: string;

  @Column('text')
  description: string;

  @Column('text')
  requirements: string;

  @Column('text')
  materials: string;

  @Column({ default: 5 })
  processingDays: number;

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  recommended: boolean;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  favoriteCount: number;

  @Column({ default: 0 })
  subscriptionCount: number;

  @Column({ default: 0 })
  applicationCount: number;

  @Column({ nullable: true })
  publishedBy: number;

  @Column({ default: 'draft' })
  publishStatus: string;

  @Column({ type: 'text', nullable: true })
  changeLog: string;

  @Column({ type: 'text', nullable: true })
  faqs: string;

  @Column({ type: 'text', nullable: true })
  handlingExamples: string;

  @Column({ type: 'text', nullable: true })
  riskTips: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

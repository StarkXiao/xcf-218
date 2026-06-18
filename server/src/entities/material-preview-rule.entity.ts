import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceItem } from './service-item.entity';
import { MaterialTemplate } from './material-template.entity';

@Entity('material_preview_rules')
export class MaterialPreviewRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  serviceItemId: number;

  @ManyToOne(() => ServiceItem)
  @JoinColumn({ name: 'serviceItemId' })
  serviceItem: ServiceItem;

  @Column({ nullable: true })
  materialTemplateId: number;

  @ManyToOne(() => MaterialTemplate)
  @JoinColumn({ name: 'materialTemplateId' })
  materialTemplate: MaterialTemplate;

  @Column()
  fieldName: string;

  @Column()
  fieldLabel: string;

  @Column({ default: true })
  required: boolean;

  @Column('simple-array', { nullable: true })
  allowedFileTypes: string[];

  @Column({ default: 10 })
  maxFileSize: number;

  @Column('text', { nullable: true })
  validationPattern: string;

  @Column('text', { nullable: true })
  validationMessage: string;

  @Column('text', { nullable: true })
  customRule: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
